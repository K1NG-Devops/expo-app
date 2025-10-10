/**
 * Simplified PDF Generator - Direct, reliable approach
 * 
 * This generator uses the same approach I would use:
 * 1. Create structured content
 * 2. Format as clean HTML
 * 3. Generate PDF directly
 * 4. Return result
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { assertSupabase } from '@/lib/supabase';
import { getCurrentSession, getCurrentProfile } from '@/lib/sessionManager';

export interface SimplePDFOptions {
  title?: string;
  docType?: 'worksheet' | 'lesson_plan' | 'assessment' | 'report' | 'general';
  theme?: 'professional' | 'educational' | 'colorful';
}

export interface SimplePDFResult {
  success: boolean;
  uri?: string;
  filename?: string;
  error?: string;
}

export class SimplePDFGenerator {
  
  /**
   * Generate PDF from a prompt - the same way I would approach it
   */
  async generateFromPrompt(
    prompt: string, 
    options: SimplePDFOptions = {}
  ): Promise<SimplePDFResult> {
    try {
      console.log('📄 SimplePDFGenerator: Starting PDF generation...');
      console.log('📝 Prompt:', prompt.substring(0, 100) + '...');
      
      // 1. Create structured content (like I do mentally)
      let content = this.createContentStructure(prompt, options);
      
      // 1b. Enrich content via AI (uses existing ai-gateway)
      try {
        const enriched = await this.generateRichContentWithAI(prompt, options, content.title);
        if (enriched) {
          content = enriched;
        }
      } catch (e) {
        console.warn('⚠️ SimplePDFGenerator AI enrichment failed, using basic content', e);
      }
      
      // 2. Format as clean HTML (like I would structure a document)
      const html = this.formatAsHTML(content, options);
      
      // 3. Generate filename
      const filename = this.generateFilename(options.title || content.title, options.docType);
      
      // 4. Generate PDF directly
      console.log('🔄 Generating PDF with expo-print...');
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      
      console.log('✅ PDF generated successfully!');
      console.log('📁 URI:', uri);
      
      return {
        success: true,
        uri,
        filename,
      };
      
    } catch (error) {
      console.error('❌ SimplePDFGenerator error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'PDF generation failed'
      };
    }
  }
  
  /**
   * Generate rich, detailed content using AI (like Claude would)
   */
  private async generateRichContentWithAI(
    prompt: string, 
    options: SimplePDFOptions,
    fallbackTitle: string
  ): Promise<any | null> {
    try {
      console.log('🤖 Generating rich content with AI...');
      
      const supabase = assertSupabase();
      
      // Create enhanced prompt for AI content generation
      const enhancedPrompt = `Create comprehensive educational content for: "${prompt}"

Requirements:
- Generate detailed, age-appropriate content
- Include practical examples and activities
- Create engaging sections with clear headings
- Add fun facts, tips, or interesting details
- Make it educational but easy to understand
- Structure for ${options.docType || 'general'} format

Please respond with a JSON object containing:
{
  "title": "Engaging title",
  "sections": [
    {
      "heading": "Section title",
      "content": "Rich, detailed content with examples and activities"
    }
  ]
}`;
      
      const { data, error } = await supabase.functions.invoke('ai-gateway', {
        body: {
          action: 'lesson_planning',
          prompt: enhancedPrompt,
          gradeLevel: this.extractGradeLevel(prompt),
          subject: this.extractSubject(prompt),
          model: process.env.EXPO_PUBLIC_ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022'
        }
      });
      
      if (error) {
        console.warn('⚠️ AI content generation failed:', error);
        return null;
      }
      
      // Parse AI response
      let aiContent;
      try {
        // Try to parse as JSON first
        const jsonMatch = data.content?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          aiContent = JSON.parse(jsonMatch[0]);
        } else {
          // Fallback: structure the raw AI response
          aiContent = this.structureAIResponse(data.content || data.message, fallbackTitle);
        }
      } catch (parseError) {
        // If JSON parsing fails, structure the raw response
        aiContent = this.structureAIResponse(data.content || data.message, fallbackTitle);
      }
      
      // Add metadata
      aiContent.generatedAt = new Date().toLocaleDateString();
      aiContent.aiGenerated = true;
      
      console.log('✨ AI-generated rich content ready');
      return aiContent;
      
    } catch (error) {
      console.error('❌ AI content generation error:', error);
      return null;
    }
  }
  
  /**
   * Structure AI response into proper format if JSON parsing fails
   */
  private structureAIResponse(aiResponse: string, fallbackTitle: string) {
    const lines = aiResponse.split('\n').filter(line => line.trim());
    const sections = [];
    let currentSection = null;
    
    for (const line of lines) {
      // Check if this looks like a heading
      if (line.match(/^#+\s+/) || line.match(/^\*\*.*\*\*$/) || line.includes(':') && line.length < 100) {
        // Save previous section
        if (currentSection) {
          sections.push(currentSection);
        }
        
        // Start new section
        currentSection = {
          heading: line.replace(/^#+\s+/, '').replace(/\*\*/g, '').trim(),
          content: ''
        };
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      } else {
        // No current section, create a default one
        currentSection = {
          heading: 'Overview',
          content: line
        };
      }
    }
    
    // Add the last section
    if (currentSection) {
      sections.push(currentSection);
    }
    
    return {
      title: this.extractTitleFromAI(aiResponse) || fallbackTitle,
      sections: sections.length > 0 ? sections : [{
        heading: 'Content',
        content: aiResponse
      }]
    };
  }
  
  /**
   * Extract title from AI response
   */
  private extractTitleFromAI(response: string): string | null {
    const titlePatterns = [
      /^#\s+(.+)$/m,
      /^\*\*(.+)\*\*$/m,
      /Title:\s*(.+)$/m,
      /^(.+)(?:\n=+|\n-+)$/m
    ];
    
    for (const pattern of titlePatterns) {
      const match = response.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }
  
  /**
   * Extract subject from prompt
   */
  private extractSubject(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    if (/math|arithmetic|algebra|geometry|calculus|number/.test(lower)) return 'Mathematics';
    if (/english|language\s*arts|reading|writing|literature|grammar/.test(lower)) return 'English Language Arts';
    if (/science|biology|chemistry|physics|earth|nature|experiment/.test(lower)) return 'Science';
    if (/history|social\s*studies|geography|civics|culture/.test(lower)) return 'Social Studies';
    if (/art|music|drama|creative|painting|drawing/.test(lower)) return 'Arts';
    if (/pe|physical\s*education|health|exercise|sport/.test(lower)) return 'Physical Education';
    if (/robot|technology|computer|coding|engineering/.test(lower)) return 'Technology/Engineering';
    
    return 'General Studies';
  }
  
  /**
   * Extract grade level from prompt
   */
  private extractGradeLevel(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    if (/kindergarten|pre-k|preschool|3\s*year|4\s*year|5\s*year/.test(lower)) return 'Early Childhood';
    if (/grade\s*[k1-3]|elementary|primary/.test(lower)) return 'Elementary';
    if (/grade\s*[4-8]|middle/.test(lower)) return 'Middle School';
    if (/grade\s*(9|10|11|12)|high\s*school|teen/.test(lower)) return 'High School';
    if (/college|university|adult/.test(lower)) return 'Adult/Higher Education';
    
    // Default based on common educational terms
    if (/children|kids|young/.test(lower)) return 'Elementary';
    return 'General';
  }

  /**
   * Create structured content from prompt
   * This mimics how I would break down a request
   */
  private createContentStructure(prompt: string, options: SimplePDFOptions) {
    const lower = prompt.toLowerCase();
    
    // Extract or generate title
    let title = options.title;
    if (!title) {
      if (lower.includes('robotics')) {
        title = 'Introduction to Robotics for Children';
      } else if (lower.includes('math')) {
        title = 'Mathematics Worksheet';
      } else if (lower.includes('lesson')) {
        title = 'Lesson Plan';
      } else {
        title = 'Educational Document';
      }
    }
    
    // Create content sections based on document type and prompt
    const sections = this.generateContentSections(prompt, options.docType || 'general');
    
    return {
      title,
      sections,
      generatedAt: new Date().toLocaleDateString(),
    };
  }
  
  /**
   * Generate content sections based on the request
   */
  private generateContentSections(prompt: string, docType: string) {
    const lower = prompt.toLowerCase();
    
    if (lower.includes('robotics')) {
      return [
        {
          heading: 'What are Robots?',
          content: 'Robots are machines that can move and do tasks automatically. They help people in many ways!'
        },
        {
          heading: 'Robot Parts',
          content: '• **Sensors** - Help robots "see" and "feel" their environment\n• **Motors** - Help robots move their parts\n• **Controllers** - The robot\'s "brain" that makes decisions\n• **Body** - The structure that holds everything together'
        },
        {
          heading: 'Types of Robots',
          content: '• **Helper Robots** - Vacuum cleaners, lawn mowers\n• **Industrial Robots** - Build cars and other products\n• **Exploration Robots** - Explore space and deep oceans\n• **Medical Robots** - Help doctors with operations'
        },
        {
          heading: 'Fun Facts',
          content: '• The word "robot" comes from a Czech word meaning "worker"\n• Some robots can learn new things, just like you!\n• Robots never get tired and can work 24 hours a day\n• The first robot was built in 1961'
        }
      ];
    }
    
    if (docType === 'worksheet') {
      return [
        {
          heading: 'Instructions',
          content: 'Complete the following activities. Take your time and do your best!'
        },
        {
          heading: 'Activity 1',
          content: 'Write or draw what you learned about the topic above.'
        },
        {
          heading: 'Activity 2',
          content: 'Answer these questions:\n\n1. _________________________________\n\n2. _________________________________\n\n3. _________________________________'
        },
        {
          heading: 'Challenge',
          content: 'Create your own example or draw a picture related to today\'s topic.'
        }
      ];
    }
    
    if (docType === 'lesson_plan') {
      return [
        {
          heading: 'Learning Objectives',
          content: 'Students will be able to understand and explain the main concepts of the topic.'
        },
        {
          heading: 'Materials Needed',
          content: '• Paper and pencils\n• Visual aids\n• Interactive materials\n• Assessment sheets'
        },
        {
          heading: 'Lesson Structure',
          content: '**Introduction (10 min)** - Engage students with questions\n**Main Activity (20 min)** - Present core concepts\n**Practice (15 min)** - Hands-on activities\n**Wrap-up (5 min)** - Review and assess understanding'
        },
        {
          heading: 'Assessment',
          content: 'Observe student participation and check understanding through questions and activities.'
        }
      ];
    }
    
    // Default general content
    return [
      {
        heading: 'Overview',
        content: 'This document provides information about the requested topic.'
      },
      {
        heading: 'Key Points',
        content: '• Important concept 1\n• Important concept 2\n• Important concept 3'
      },
      {
        heading: 'Summary',
        content: 'This covers the main ideas and concepts related to your request.'
      }
    ];
  }
  
  /**
   * Format content as clean HTML
   */
  private formatAsHTML(content: any, options: SimplePDFOptions) {
    const theme = this.getThemeStyles(options.theme || 'professional');
    
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${content.title}</title>
  <style>
    ${theme}
    
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      margin: 40px;
      color: #333;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2563eb;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .title {
      font-size: 28px;
      font-weight: bold;
      color: #1e40af;
      margin-bottom: 10px;
    }
    
    .date {
      color: #666;
      font-size: 14px;
    }
    
    .section {
      margin-bottom: 25px;
    }
    
    .section h2 {
      color: #1e40af;
      font-size: 20px;
      border-left: 4px solid #3b82f6;
      padding-left: 12px;
      margin-bottom: 12px;
    }
    
    .section p, .section div {
      margin-bottom: 12px;
    }
    
    ul, ol {
      padding-left: 20px;
    }
    
    li {
      margin-bottom: 5px;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #888;
      border-top: 1px solid #ddd;
      padding-top: 20px;
    }
    
    strong {
      color: #1e40af;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${content.title}</div>
    <div class="date">Generated on ${content.generatedAt}</div>
  </div>
  
  ${content.sections.map((section: any) => `
    <div class="section">
      <h2>${section.heading}</h2>
      <div>${this.formatContent(section.content)}</div>
    </div>
  `).join('')}
  
  <div class="footer">
    Generated by Dash AI - EduDash Pro Educational Platform
  </div>
</body>
</html>`;
  }
  
  /**
   * Format content with markdown-like syntax
   */
  private formatContent(content: string): string {
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^•/gm, '&bull;')
      .replace(/^(\d+\.)/gm, '<strong>$1</strong>')
      .trim();
  }
  
  /**
   * Get theme-specific styles
   */
  private getThemeStyles(theme: string): string {
    switch (theme) {
      case 'educational':
        return `
          .header { border-bottom-color: #059669; }
          .title { color: #047857; }
          .section h2 { color: #047857; border-left-color: #10b981; }
          strong { color: #047857; }
        `;
      case 'colorful':
        return `
          .header { border-bottom-color: #7c3aed; }
          .title { color: #6d28d9; }
          .section h2 { color: #6d28d9; border-left-color: #8b5cf6; }
          strong { color: #6d28d9; }
        `;
      default: // professional
        return '';
    }
  }
  
  /**
   * Generate appropriate filename
   */
  private generateFilename(title: string, docType?: string): string {
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    const timestamp = new Date().toISOString().slice(0, 10);
    const prefix = docType && docType !== 'general' ? `${docType}-` : '';
    
    return `${prefix}${cleanTitle}-${timestamp}.pdf`;
  }
}

// Export singleton instance
export const simplePDFGenerator = new SimplePDFGenerator();