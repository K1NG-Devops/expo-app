/**
 * EmailTemplateService
 * 
 * Service for managing email templates, rendering with variables,
 * and sending progress reports and newsletters.
 * 
 * Features:
 * - Template management (CRUD)
 * - Variable substitution (Mustache-style {{variable}})
 * - Progress report generation
 * - Newsletter composition
 * - Email sending via Supabase Edge Function
 */

import { supabase } from '@/lib/supabase';

export interface EmailTemplate {
  id: string;
  preschool_id: string | null;
  name: string;
  template_type: 'progress_report' | 'newsletter' | 'event_reminder' | 'invoice' | 'welcome' | 'custom';
  subject_template: string;
  body_html: string;
  body_text: string | null;
  variables: string[];
  is_system_template: boolean;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressReport {
  id?: string;
  preschool_id: string;
  student_id: string;
  teacher_id: string;
  report_period: string; // e.g., "Q1 2025", "Term 1"
  report_type: 'weekly' | 'monthly' | 'quarterly' | 'annual';
  overall_comments?: string;
  teacher_comments?: string;
  strengths?: string;
  areas_for_improvement?: string;
  subjects_performance?: Record<string, { grade: string; comments: string }>;
  attendance_summary?: { present: number; absent: number; percentage: number };
  behavioral_notes?: any;
  overall_grade?: string;
  email_sent_at?: string;
  email_message_id?: string;
}

export interface Newsletter {
  id?: string;
  preschool_id: string;
  title: string;
  content_html: string;
  content_text?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  scheduled_for?: string;
  sent_at?: string;
  recipient_filter?: {
    roles?: string[];
    classes?: string[];
  };
  total_recipients?: number;
  sent_count?: number;
  failed_count?: number;
  open_count?: number;
  click_count?: number;
  created_by: string;
}

export interface EmailSendRequest {
  to: string | string[];
  subject: string;
  body: string;
  is_html?: boolean;
  reply_to?: string;
  cc?: string[];
  bcc?: string[];
  confirmed?: boolean;
}

class EmailTemplateService {
  /**
   * Get all templates for a preschool (including system templates)
   */
  async getTemplates(preschoolId: string, type?: string): Promise<EmailTemplate[]> {
    let query = supabase
      .from('email_templates')
      .select('*')
      .or(`preschool_id.eq.${preschoolId},is_system_template.eq.true`)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('template_type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[EmailTemplateService] Failed to fetch templates:', error);
      throw error;
    }

    return data || [];
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) {
      console.error('[EmailTemplateService] Failed to fetch template:', error);
      return null;
    }

    return data;
  }

  /**
   * Create a custom template
   */
  async createTemplate(template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<EmailTemplate | null> {
    const { data, error } = await supabase
      .from('email_templates')
      .insert(template)
      .select()
      .single();

    if (error) {
      console.error('[EmailTemplateService] Failed to create template:', error);
      return null;
    }

    return data;
  }

  /**
   * Render template with variables
   */
  renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;

    // Simple Mustache-style variable substitution
    Object.keys(variables).forEach((key) => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      const value = variables[key] ?? '';
      rendered = rendered.replace(regex, String(value));
    });

    return rendered;
  }

  /**
   * Generate progress report HTML
   */
  async generateProgressReportEmail(
    report: ProgressReport,
    studentName: string,
    parentName: string,
    teacherName: string,
    preschoolName: string
  ): Promise<{ subject: string; html: string; text: string }> {
    // Get progress report template
    const templates = await this.getTemplates(report.preschool_id, 'progress_report');
    const template = templates[0]; // Use first available template

    if (!template) {
      throw new Error('No progress report template found');
    }

    // Generate subjects performance table
    const subjectsTable = report.subjects_performance
      ? Object.entries(report.subjects_performance)
          .map(
            ([subject, data]) =>
              `<tr><td style="padding: 8px; border: 1px solid #ddd;">${subject}</td><td style="padding: 8px; border: 1px solid #ddd;">${data.grade}</td><td style="padding: 8px; border: 1px solid #ddd;">${data.comments}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="3" style="padding: 8px;">No subject data available</td></tr>';

    const subjectsTableHtml = `
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <thead>
          <tr style="background-color: #f0f0f0;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Subject</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Grade</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Comments</th>
          </tr>
        </thead>
        <tbody>
          ${subjectsTable}
        </tbody>
      </table>
    `;

    // Variables for template
    const variables = {
      student_name: studentName,
      parent_name: parentName,
      report_period: report.report_period,
      overall_grade: report.overall_grade || 'N/A',
      teacher_comments: report.teacher_comments || 'No comments provided',
      subjects_table: subjectsTableHtml,
      teacher_name: teacherName,
      preschool_name: preschoolName,
      strengths: report.strengths || '',
      areas_for_improvement: report.areas_for_improvement || '',
    };

    const subject = this.renderTemplate(template.subject_template, variables);
    const html = this.renderTemplate(template.body_html, variables);
    const text = template.body_text ? this.renderTemplate(template.body_text, variables) : '';

    return { subject, html, text };
  }

  /**
   * Generate newsletter HTML
   */
  async generateNewsletterEmail(
    newsletter: Newsletter,
    preschoolName: string
  ): Promise<{ subject: string; html: string; text: string }> {
    // Get newsletter template
    const templates = await this.getTemplates(newsletter.preschool_id, 'newsletter');
    const template = templates[0];

    if (!template) {
      throw new Error('No newsletter template found');
    }

    // Extract month from title or use current
    const month = newsletter.title.includes(' - ')
      ? newsletter.title.split(' - ')[1]
      : new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const variables = {
      preschool_name: preschoolName,
      month,
      content: newsletter.content_html,
    };

    const subject = this.renderTemplate(template.subject_template, variables);
    const html = this.renderTemplate(template.body_html, variables);
    const text = newsletter.content_text || this.renderTemplate(template.body_text || '', variables);

    return { subject, html, text };
  }

  /**
   * Send email via Supabase Edge Function
   */
  async sendEmail(request: EmailSendRequest): Promise<{ success: boolean; message_id?: string; error?: string }> {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        ...request,
        is_html: request.is_html !== false,
        confirmed: true, // Explicitly confirm
      },
    });

    if (error) {
      console.error('[EmailTemplateService] Failed to send email:', error);
      return { success: false, error: error.message };
    }

    return data;
  }

  /**
   * Send progress report to parent
   */
  async sendProgressReport(
    report: ProgressReport,
    parentEmail: string,
    studentName: string,
    parentName: string,
    teacherName: string,
    preschoolName: string
  ): Promise<{ success: boolean; message_id?: string; error?: string }> {
    try {
      const { subject, html } = await this.generateProgressReportEmail(
        report,
        studentName,
        parentName,
        teacherName,
        preschoolName
      );

      const result = await this.sendEmail({
        to: parentEmail,
        subject,
        body: html,
        is_html: true,
        confirmed: true,
      });

      // Update report with email tracking info
      if (result.success && report.id) {
        await supabase
          .from('progress_reports')
          .update({
            email_sent_at: new Date().toISOString(),
            email_message_id: result.message_id,
          })
          .eq('id', report.id);
      }

      return result;
    } catch (error: any) {
      console.error('[EmailTemplateService] Failed to send progress report:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Save progress report to database
   */
  async saveProgressReport(report: Omit<ProgressReport, 'id'>): Promise<ProgressReport | null> {
    const { data, error } = await supabase
      .from('progress_reports')
      .insert(report)
      .select()
      .single();

    if (error) {
      console.error('[EmailTemplateService] Failed to save progress report:', error);
      return null;
    }

    return data;
  }

  /**
   * Get progress reports for a student
   */
  async getProgressReports(studentId: string): Promise<ProgressReport[]> {
    const { data, error } = await supabase
      .from('progress_reports')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[EmailTemplateService] Failed to fetch progress reports:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Save newsletter to database
   */
  async saveNewsletter(newsletter: Omit<Newsletter, 'id'>): Promise<Newsletter | null> {
    const { data, error } = await supabase
      .from('newsletters')
      .insert(newsletter)
      .select()
      .single();

    if (error) {
      console.error('[EmailTemplateService] Failed to save newsletter:', error);
      return null;
    }

    return data;
  }

  /**
   * Get newsletters for a preschool
   */
  async getNewsletters(preschoolId: string): Promise<Newsletter[]> {
    const { data, error } = await supabase
      .from('newsletters')
      .select('*')
      .eq('preschool_id', preschoolId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[EmailTemplateService] Failed to fetch newsletters:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Send newsletter to recipients
   */
  async sendNewsletter(
    newsletter: Newsletter,
    recipients: Array<{ email: string; name: string; user_id?: string }>,
    preschoolName: string
  ): Promise<{ success: boolean; sent: number; failed: number }> {
    try {
      const { subject, html } = await this.generateNewsletterEmail(newsletter, preschoolName);

      let sent = 0;
      let failed = 0;

      // Send to each recipient
      for (const recipient of recipients) {
        const result = await this.sendEmail({
          to: recipient.email,
          subject,
          body: html,
          is_html: true,
          confirmed: true,
        });

        if (result.success) {
          sent++;
          
          // Track individual send
          if (newsletter.id) {
            await supabase.from('newsletter_recipients').insert({
              newsletter_id: newsletter.id,
              user_id: recipient.user_id,
              email: recipient.email,
              status: 'sent',
              sent_at: new Date().toISOString(),
            });
          }
        } else {
          failed++;
          
          // Track failed send
          if (newsletter.id) {
            await supabase.from('newsletter_recipients').insert({
              newsletter_id: newsletter.id,
              user_id: recipient.user_id,
              email: recipient.email,
              status: 'failed',
              error_message: result.error,
            });
          }
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Update newsletter stats
      if (newsletter.id) {
        await supabase
          .from('newsletters')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            total_recipients: recipients.length,
            sent_count: sent,
            failed_count: failed,
          })
          .eq('id', newsletter.id);
      }

      return { success: true, sent, failed };
    } catch (error: any) {
      console.error('[EmailTemplateService] Failed to send newsletter:', error);
      return { success: false, sent: 0, failed: recipients.length };
    }
  }
}

export const emailTemplateService = new EmailTemplateService();
export default emailTemplateService;
