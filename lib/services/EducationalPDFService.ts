/**
 * Educational PDF Generation Service
 * 
 * Generates printable worksheets, activities, and educational resources
 * for children and teachers using the existing expo-print infrastructure.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';
import type { Assignment } from '@/lib/models/Assignment';
import type { Submission } from '@/lib/models/Submission';

// ====================================================================
// TYPES AND INTERFACES
// ====================================================================

export interface WorksheetOptions {
  title?: string;
  studentName?: string;
  dateCreated?: string;
  includeAnswerKey?: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  ageGroup: '3-4' | '4-5' | '5-6' | '6-7' | '7-8';
  colorMode: 'color' | 'blackwhite';
  paperSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
}

export interface MathWorksheetData {
  type: 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
  problemCount: number;
  numberRange: { min: number; max: number };
  showHints?: boolean;
  includeImages?: boolean;
}

export interface ReadingWorksheetData {
  type: 'comprehension' | 'vocabulary' | 'phonics' | 'sight-words';
  content: string;
  questions: Array<{
    question: string;
    type: 'multiple-choice' | 'short-answer' | 'true-false';
    options?: string[];
    correctAnswer?: string;
  }>;
}

export interface ActivitySheetData {
  type: 'coloring' | 'tracing' | 'matching' | 'puzzle' | 'creative';
  theme: string;
  instructions: string;
  materials?: string[];
}

export type WorksheetType = 'math' | 'reading' | 'activity' | 'assignment' | 'practice';

export interface GeneratePDFOptions {
  worksheetType: WorksheetType;
  data: MathWorksheetData | ReadingWorksheetData | ActivitySheetData | Assignment;
  options: WorksheetOptions;
}

// ====================================================================
// EDUCATIONAL PDF SERVICE
// ====================================================================

class EducationalPDFServiceImpl {
  
  /**
   * Generate a worksheet PDF from assignment data
   */
  async generateWorksheetFromAssignment(
    assignment: Assignment, 
    options: WorksheetOptions
  ): Promise<void> {
    try {
      const htmlContent = this.createAssignmentWorksheetHTML(assignment, options);
      await this.generateAndSharePDF(
        htmlContent, 
        `worksheet-${assignment.title.toLowerCase().replace(/\s+/g, '-')}`
      );
    } catch (error) {
      console.error('Assignment worksheet generation failed:', error);
      Alert.alert('Error', 'Failed to generate worksheet PDF');
    }
  }

  /**
   * Generate math practice worksheet
   */
  async generateMathWorksheet(
    data: MathWorksheetData, 
    options: WorksheetOptions
  ): Promise<void> {
    try {
      const htmlContent = this.createMathWorksheetHTML(data, options);
      await this.generateAndSharePDF(
        htmlContent, 
        `math-worksheet-${data.type}-${Date.now()}`
      );
    } catch (error) {
      console.error('Math worksheet generation failed:', error);
      Alert.alert('Error', 'Failed to generate math worksheet PDF');
    }
  }

  /**
   * Generate reading comprehension worksheet
   */
  async generateReadingWorksheet(
    data: ReadingWorksheetData, 
    options: WorksheetOptions
  ): Promise<void> {
    try {
      const htmlContent = this.createReadingWorksheetHTML(data, options);
      await this.generateAndSharePDF(
        htmlContent, 
        `reading-worksheet-${data.type}-${Date.now()}`
      );
    } catch (error) {
      console.error('Reading worksheet generation failed:', error);
      Alert.alert('Error', 'Failed to generate reading worksheet PDF');
    }
  }

  /**
   * Generate activity sheet for children
   */
  async generateActivitySheet(
    data: ActivitySheetData, 
    options: WorksheetOptions
  ): Promise<void> {
    try {
      const htmlContent = this.createActivitySheetHTML(data, options);
      await this.generateAndSharePDF(
        htmlContent, 
        `activity-sheet-${data.type}-${Date.now()}`
      );
    } catch (error) {
      console.error('Activity sheet generation failed:', error);
      Alert.alert('Error', 'Failed to generate activity sheet PDF');
    }
  }

  /**
   * Generate answer key for any worksheet
   */
  async generateAnswerKey(
    worksheetData: MathWorksheetData | ReadingWorksheetData,
    options: WorksheetOptions
  ): Promise<void> {
    try {
      const htmlContent = this.createAnswerKeyHTML(worksheetData, options);
      await this.generateAndSharePDF(
        htmlContent, 
        `answer-key-${Date.now()}`
      );
    } catch (error) {
      console.error('Answer key generation failed:', error);
      Alert.alert('Error', 'Failed to generate answer key PDF');
    }
  }

  // ====================================================================
  // HTML TEMPLATE GENERATORS
  // ====================================================================

  /**
   * Create HTML for assignment-based worksheet
   */
  private createAssignmentWorksheetHTML(
    assignment: Assignment, 
    options: WorksheetOptions
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${assignment.title} - Worksheet</title>
        <style>${this.getBaseStyles(options)}</style>
      </head>
      <body>
        ${this.getWorksheetHeader(assignment.title, options)}
        
        <div class="content-section">
          <div class="instructions">
            <h3>📋 Instructions</h3>
            <p>${assignment.instructions || assignment.description || 'Complete the following tasks.'}</p>
          </div>

          <div class="assignment-content">
            <h3>📝 ${assignment.assignment_type.toUpperCase()}</h3>
            ${this.generateAssignmentQuestions(assignment, options)}
          </div>

          ${options.includeAnswerKey ? this.generateAnswerSection() : ''}
        </div>

        ${this.getWorksheetFooter(options)}
      </body>
      </html>
    `;
  }

  /**
   * Create HTML for math worksheet
   */
  private createMathWorksheetHTML(
    data: MathWorksheetData, 
    options: WorksheetOptions
  ): string {
    const problems = this.generateMathProblems(data);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Math Worksheet - ${data.type}</title>
        <style>${this.getBaseStyles(options)}${this.getMathStyles()}</style>
      </head>
      <body>
        ${this.getWorksheetHeader(`Math Practice: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`, options)}
        
        <div class="content-section">
          <div class="instructions">
            <h3>🔢 Instructions</h3>
            <p>Solve each problem. Show your work in the space provided.</p>
            ${data.showHints ? '<p><em>💡 Hint: Take your time and check your answers!</em></p>' : ''}
          </div>

          <div class="math-problems">
            ${problems.map((problem, index) => `
              <div class="problem-item">
                <span class="problem-number">${index + 1}.</span>
                <span class="problem-text">${problem.question}</span>
                <span class="answer-space">= _______</span>
                ${data.showHints && problem.hint ? `<div class="hint">💡 ${problem.hint}</div>` : ''}
              </div>
            `).join('')}
          </div>

          ${options.includeAnswerKey ? this.generateMathAnswerKey(problems) : ''}
        </div>

        ${this.getWorksheetFooter(options)}
      </body>
      </html>
    `;
  }

  /**
   * Create HTML for reading worksheet
   */
  private createReadingWorksheetHTML(
    data: ReadingWorksheetData, 
    options: WorksheetOptions
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reading Worksheet - ${data.type}</title>
        <style>${this.getBaseStyles(options)}${this.getReadingStyles()}</style>
      </head>
      <body>
        ${this.getWorksheetHeader(`Reading Practice: ${data.type.charAt(0).toUpperCase() + data.type.slice(1)}`, options)}
        
        <div class="content-section">
          ${data.type === 'comprehension' ? `
            <div class="reading-passage">
              <h3>📖 Reading Passage</h3>
              <div class="passage-text">${data.content}</div>
            </div>
          ` : ''}

          <div class="questions-section">
            <h3>❓ Questions</h3>
            ${data.questions.map((question, index) => `
              <div class="question-item">
                <p><strong>${index + 1}. ${question.question}</strong></p>
                ${this.generateQuestionAnswerSpace(question)}
              </div>
            `).join('')}
          </div>

          ${options.includeAnswerKey ? this.generateReadingAnswerKey(data.questions) : ''}
        </div>

        ${this.getWorksheetFooter(options)}
      </body>
      </html>
    `;
  }

  /**
   * Create HTML for activity sheet
   */
  private createActivitySheetHTML(
    data: ActivitySheetData, 
    options: WorksheetOptions
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Activity Sheet - ${data.type}</title>
        <style>${this.getBaseStyles(options)}${this.getActivityStyles()}</style>
      </head>
      <body>
        ${this.getWorksheetHeader(`Fun Activity: ${data.theme}`, options)}
        
        <div class="content-section">
          <div class="activity-intro">
            <h3>🎨 Let's Have Fun!</h3>
            <p>${data.instructions}</p>
            ${data.materials ? `
              <div class="materials-list">
                <h4>📦 You'll Need:</h4>
                <ul>
                  ${data.materials.map(item => `<li>${item}</li>`).join('')}
                </ul>
              </div>
            ` : ''}
          </div>

          <div class="activity-space">
            ${this.generateActivityContent(data)}
          </div>
        </div>

        ${this.getWorksheetFooter(options)}
      </body>
      </html>
    `;
  }

  // ====================================================================
  // CONTENT GENERATORS
  // ====================================================================

  /**
   * Generate math problems based on type and difficulty
   */
  private generateMathProblems(data: MathWorksheetData): Array<{question: string, answer: number, hint?: string}> {
    const problems: Array<{question: string, answer: number, hint?: string}> = [];
    
    for (let i = 0; i < data.problemCount; i++) {
      const num1 = Math.floor(Math.random() * (data.numberRange.max - data.numberRange.min + 1)) + data.numberRange.min;
      const num2 = Math.floor(Math.random() * (data.numberRange.max - data.numberRange.min + 1)) + data.numberRange.min;
      
      let question: string;
      let answer: number;
      let hint: string | undefined;

      switch (data.type) {
        case 'addition':
          question = `${num1} + ${num2}`;
          answer = num1 + num2;
          hint = data.showHints ? `Try counting up from ${num1}` : undefined;
          break;
        case 'subtraction':
          const larger = Math.max(num1, num2);
          const smaller = Math.min(num1, num2);
          question = `${larger} - ${smaller}`;
          answer = larger - smaller;
          hint = data.showHints ? `Count backwards from ${larger}` : undefined;
          break;
        case 'multiplication':
          question = `${num1} × ${num2}`;
          answer = num1 * num2;
          hint = data.showHints ? `Think of ${num1} groups of ${num2}` : undefined;
          break;
        case 'division':
          const dividend = num1 * num2;
          question = `${dividend} ÷ ${num1}`;
          answer = num2;
          hint = data.showHints ? `How many ${num1}s make ${dividend}?` : undefined;
          break;
        default: // mixed
          const operations = ['+', '-', '×'];
          const op = operations[Math.floor(Math.random() * operations.length)];
          if (op === '+') {
            question = `${num1} + ${num2}`;
            answer = num1 + num2;
          } else if (op === '-') {
            const larger = Math.max(num1, num2);
            const smaller = Math.min(num1, num2);
            question = `${larger} - ${smaller}`;
            answer = larger - smaller;
          } else {
            question = `${num1} × ${num2}`;
            answer = num1 * num2;
          }
          break;
      }

      problems.push({ question, answer, hint });
    }

    return problems;
  }

  /**
   * Generate assignment-specific questions
   */
  private generateAssignmentQuestions(assignment: Assignment, options: WorksheetOptions): string {
    // This would be expanded based on assignment type and content
    const questionCount = Math.min(10, Math.max(5, Math.floor(assignment.max_points / 2)));
    
    let questionsHTML = '';
    for (let i = 1; i <= questionCount; i++) {
      questionsHTML += `
        <div class="question-space">
          <p><strong>Question ${i}:</strong></p>
          <div class="answer-lines">
            <div class="line"></div>
            <div class="line"></div>
            <div class="line"></div>
          </div>
        </div>
      `;
    }
    
    return questionsHTML;
  }

  /**
   * Generate question answer space based on type
   */
  private generateQuestionAnswerSpace(question: any): string {
    switch (question.type) {
      case 'multiple-choice':
        return `
          <div class="multiple-choice">
            ${question.options?.map((option: string, index: number) => `
              <div class="choice-item">
                <input type="checkbox" disabled> ${String.fromCharCode(65 + index)}. ${option}
              </div>
            `).join('') || ''}
          </div>
        `;
      case 'true-false':
        return `
          <div class="true-false">
            <input type="checkbox" disabled> True &nbsp;&nbsp;&nbsp;
            <input type="checkbox" disabled> False
          </div>
        `;
      default: // short-answer
        return `
          <div class="answer-lines">
            <div class="line"></div>
            <div class="line"></div>
          </div>
        `;
    }
  }

  /**
   * Generate activity content based on type
   */
  private generateActivityContent(data: ActivitySheetData): string {
    switch (data.type) {
      case 'coloring':
        return `
          <div class="coloring-area">
            <div class="coloring-frame">
              <p style="text-align: center; font-size: 48px; margin: 100px 0;">
                🎨 Coloring Space 🖍️
              </p>
              <p style="text-align: center; color: #666;">
                Draw and color your ${data.theme} here!
              </p>
            </div>
          </div>
        `;
      case 'tracing':
        return `
          <div class="tracing-area">
            ${Array.from({length: 8}, (_, i) => `
              <div class="trace-line">
                <span class="trace-guide">${data.theme.charAt(0).toUpperCase()}</span>
                <span class="trace-dots">• • • • • • • • • •</span>
              </div>
            `).join('')}
          </div>
        `;
      case 'matching':
        return `
          <div class="matching-area">
            <div class="match-column">
              <h4>Column A</h4>
              <div class="match-item">🐱 Cat</div>
              <div class="match-item">🐶 Dog</div>
              <div class="match-item">🐦 Bird</div>
              <div class="match-item">🐠 Fish</div>
            </div>
            <div class="match-column">
              <h4>Column B</h4>
              <div class="match-item">Meow</div>
              <div class="match-item">Woof</div>
              <div class="match-item">Tweet</div>
              <div class="match-item">Splash</div>
            </div>
          </div>
        `;
      default:
        return `
          <div class="creative-space">
            <div class="creative-frame">
              <p style="text-align: center; margin: 150px 0;">
                ✨ Creative Space ✨<br>
                <small>Use this space for your ${data.theme} activity!</small>
              </p>
            </div>
          </div>
        `;
    }
  }

  // ====================================================================
  // ANSWER KEY GENERATORS
  // ====================================================================

  private generateAnswerSection(): string {
    return `
      <div class="answer-key-section">
        <h3>📝 For Teachers/Parents - Answer Space</h3>
        <div class="answer-notes">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
      </div>
    `;
  }

  private generateMathAnswerKey(problems: Array<{question: string, answer: number}>): string {
    return `
      <div class="answer-key">
        <h3>🔑 Answer Key (For Teachers/Parents)</h3>
        <div class="answers-grid">
          ${problems.map((problem, index) => `
            <div class="answer-item">
              ${index + 1}. ${problem.question} = <strong>${problem.answer}</strong>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private generateReadingAnswerKey(questions: any[]): string {
    return `
      <div class="answer-key">
        <h3>🔑 Answer Key (For Teachers/Parents)</h3>
        ${questions.map((question, index) => `
          <div class="answer-item">
            <strong>${index + 1}.</strong> ${question.correctAnswer || 'Sample answer provided by teacher'}
          </div>
        `).join('')}
      </div>
    `;
  }

  private createAnswerKeyHTML(worksheetData: any, options: WorksheetOptions): string {
    // Implementation for standalone answer key
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Answer Key</title>
        <style>${this.getBaseStyles(options)}</style>
      </head>
      <body>
        ${this.getWorksheetHeader('Answer Key', options)}
        <div class="content-section">
          <h3>🔑 Complete Answer Key</h3>
          <p>Detailed answers and explanations for teachers and parents.</p>
        </div>
      </body>
      </html>
    `;
  }

  // ====================================================================
  // PDF GENERATION AND SHARING
  // ====================================================================

  /**
   * Generate an ad-hoc text-based PDF (simple export)
   */
  public async generateTextPDF(title: string, body: string): Promise<void> {
    const safeBody = (body || '').split('\n').map(p => `<p>${p.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`).join('\n');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
      <style>
        @page { size: A4; margin: 20mm; }
        body { font-family: Arial, sans-serif; color: #333; }
        .title { font-size: 24px; font-weight: bold; color: #007AFF; margin-bottom: 10px; }
        .meta { color: #777; font-size: 12px; margin-bottom: 20px; }
        .content p { margin: 8px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #999; text-align: center; border-top: 1px solid #ddd; padding-top: 8px; }
      </style></head><body>
      <div class="title">${title}</div>
      <div class="meta">Generated by EduDash Pro • ${new Date().toLocaleString()}</div>
      <div class="content">${safeBody}</div>
      <div class="footer">Exported by Dash • EduDash Pro</div>
    </body></html>`;
    await this.generateAndSharePDF(html, (title || 'dash-export').toLowerCase().replace(/\s+/g, '-'));
  }

  /**
   * Generate PDF from HTML and share it
   */
  private async generateAndSharePDF(html: string, filename: string): Promise<void> {
    try {
      const { uri } = await Print.printToFileAsync({
        html: html,
        base64: false,
      });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${filename}.pdf`,
        });
      } else {
        Alert.alert('Success', `Worksheet saved as ${filename}.pdf`);
      }
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  }

  // ====================================================================
  // STYLING AND LAYOUT
  // ====================================================================

  /**
   * Base CSS styles for all worksheets
   */
  private getBaseStyles(options: WorksheetOptions): string {
    const colorScheme = options.colorMode === 'color' ? 'color' : 'black-and-white';
    
    return `
      @page {
        size: ${options.paperSize};
        margin: 20mm;
        orientation: ${options.orientation};
      }
      
      body {
        font-family: 'Arial', sans-serif;
        line-height: 1.6;
        color: ${colorScheme === 'color' ? '#333' : '#000'};
        margin: 0;
        padding: 0;
      }
      
      .worksheet-header {
        text-align: center;
        border-bottom: 3px solid ${colorScheme === 'color' ? '#007AFF' : '#000'};
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .worksheet-title {
        font-size: 28px;
        font-weight: bold;
        color: ${colorScheme === 'color' ? '#007AFF' : '#000'};
        margin: 0 0 10px 0;
      }
      
      .worksheet-info {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        color: #666;
      }
      
      .content-section {
        margin: 20px 0;
      }
      
      .instructions {
        background: ${colorScheme === 'color' ? '#f0f8ff' : '#f5f5f5'};
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 30px;
        border-left: 4px solid ${colorScheme === 'color' ? '#007AFF' : '#000'};
      }
      
      .line {
        border-bottom: 1px solid #ccc;
        height: 30px;
        margin: 10px 0;
      }
      
      .answer-lines .line {
        margin: 5px 0;
        height: 25px;
      }
      
      .worksheet-footer {
        margin-top: 50px;
        text-align: center;
        font-size: 12px;
        color: #999;
        border-top: 1px solid #ddd;
        padding-top: 15px;
      }
      
      .answer-key {
        background: #fff5f5;
        padding: 20px;
        border-radius: 8px;
        margin-top: 30px;
        border: 2px dashed #ff6b6b;
      }
      
      .answer-key h3 {
        color: #ff6b6b;
        margin-top: 0;
      }
      
      h3 {
        color: ${colorScheme === 'color' ? '#007AFF' : '#000'};
        margin: 20px 0 10px 0;
      }
    `;
  }

  /**
   * Math-specific styles
   */
  private getMathStyles(): string {
    return `
      .math-problems {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin: 30px 0;
      }
      
      .problem-item {
        border: 1px solid #ddd;
        padding: 15px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .problem-number {
        font-weight: bold;
        color: #007AFF;
        min-width: 30px;
      }
      
      .problem-text {
        font-size: 18px;
        font-weight: bold;
        flex-grow: 1;
      }
      
      .answer-space {
        font-size: 16px;
        min-width: 100px;
        text-align: right;
      }
      
      .hint {
        grid-column: 1 / -1;
        font-style: italic;
        color: #666;
        font-size: 12px;
        margin-top: 5px;
      }
      
      .answers-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
      }
      
      .answer-item {
        padding: 5px;
        font-size: 14px;
      }
    `;
  }

  /**
   * Reading-specific styles
   */
  private getReadingStyles(): string {
    return `
      .reading-passage {
        background: #f9f9f9;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 30px;
        border-left: 4px solid #28a745;
      }
      
      .passage-text {
        font-size: 16px;
        line-height: 1.8;
        text-align: justify;
      }
      
      .questions-section {
        margin-top: 30px;
      }
      
      .question-item {
        margin: 20px 0;
        padding: 15px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
      }
      
      .multiple-choice {
        margin: 10px 0;
      }
      
      .choice-item {
        margin: 8px 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .true-false {
        margin: 10px 0;
        font-size: 16px;
      }
    `;
  }

  /**
   * Activity-specific styles
   */
  private getActivityStyles(): string {
    return `
      .activity-intro {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px;
        margin-bottom: 30px;
      }
      
      .materials-list {
        background: rgba(255,255,255,0.1);
        padding: 15px;
        border-radius: 8px;
        margin-top: 15px;
      }
      
      .materials-list ul {
        margin: 10px 0 0 20px;
      }
      
      .activity-space {
        min-height: 400px;
      }
      
      .coloring-frame, .creative-frame {
        border: 3px dashed #ff6b6b;
        border-radius: 12px;
        min-height: 300px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff9f9;
      }
      
      .tracing-area {
        margin: 30px 0;
      }
      
      .trace-line {
        display: flex;
        align-items: center;
        margin: 20px 0;
        font-size: 24px;
      }
      
      .trace-guide {
        width: 60px;
        text-align: center;
        font-weight: bold;
        color: #007AFF;
      }
      
      .trace-dots {
        flex-grow: 1;
        letter-spacing: 8px;
        color: #ccc;
        padding: 0 20px;
      }
      
      .matching-area {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 40px;
        margin: 30px 0;
      }
      
      .match-column h4 {
        text-align: center;
        color: #007AFF;
        margin-bottom: 20px;
      }
      
      .match-item {
        padding: 10px;
        margin: 10px 0;
        border: 2px solid #ddd;
        border-radius: 8px;
        text-align: center;
        font-size: 18px;
      }
    `;
  }

  /**
   * Generate worksheet header
   */
  private getWorksheetHeader(title: string, options: WorksheetOptions): string {
    const currentDate = options.dateCreated || new Date().toLocaleDateString();
    
    return `
      <div class="worksheet-header">
        <h1 class="worksheet-title">${title}</h1>
        <div class="worksheet-info">
          <div>
            <strong>Name:</strong> ${options.studentName || '________________________'}
          </div>
          <div>
            <strong>Date:</strong> ${currentDate}
          </div>
          <div>
            <strong>Age:</strong> ${options.ageGroup} years
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate worksheet footer
   */
  private getWorksheetFooter(options: WorksheetOptions): string {
    return `
      <div class="worksheet-footer">
        <p>Generated by EduDash Pro • Educational Excellence for Every Child</p>
        <p>Remember: Learning is fun! 🌟 Keep practicing and you'll get better every day! 🚀</p>
      </div>
    `;
  }
}

export const EducationalPDFService = new EducationalPDFServiceImpl();