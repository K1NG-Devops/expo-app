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
      
      // Create enhanced prompt for comprehensive teacher-ready content
      const enhancedPrompt = `Create a COMPREHENSIVE TEACHER-READY educational lesson for: "${prompt}"

This should be a COMPLETE lesson package that includes:

**LESSON STRUCTURE:**
1. **Lesson Overview** - Learning objectives, duration, grade level, subject integration
2. **Background Knowledge** - Detailed subject information for teacher preparation
3. **Vocabulary & Key Terms** - Essential terms with simple definitions
4. **Main Content** - Comprehensive subject explanation with multiple examples
5. **Teaching Strategies** - Specific methods to engage students of this age
6. **Hands-On Activities** - 2-3 practical activities with materials and step-by-step instructions
7. **Discussion Questions** - 5-7 thought-provoking questions for class discussion
8. **Assessment Ideas** - Ways to evaluate student understanding
9. **Extension Activities** - Additional projects for advanced learners
10. **Resources & References** - Books, websites, videos, and materials for further learning
11. **Cross-Curricular Connections** - How this lesson connects to other subjects
12. **Differentiation Tips** - Adaptations for different learning styles and abilities

**CONTENT REQUIREMENTS:**
- Age-appropriate for ${this.extractGradeLevel(prompt)} level
- Subject: ${this.extractSubject(prompt)}
- Include specific examples, real-world applications
- Provide safety considerations where applicable
- Add interesting facts and engaging hooks
- Include technology integration suggestions
- Provide homework/take-home activities

**FORMAT:** Respond with a JSON object:
{
  "title": "Complete lesson title",
  "lessonOverview": {
    "objectives": ["learning objective 1", "learning objective 2"],
    "duration": "estimated time",
    "gradeLevel": "grade range",
    "materials": ["list of needed materials"]
  },
  "sections": [
    {
      "heading": "Section name",
      "content": "Detailed content with examples, activities, and teaching notes"
    }
  ],
  "resources": {
    "books": ["recommended books"],
    "websites": ["educational websites"],
    "videos": ["video suggestions"],
    "materials": ["additional teaching materials"]
  },
  "assessmentIdeas": ["assessment method 1", "assessment method 2"],
  "extensionActivities": ["extension activity 1", "extension activity 2"]
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
      
      // Add comprehensive lesson metadata
      aiContent.generatedAt = new Date().toLocaleDateString();
      aiContent.aiGenerated = true;
      aiContent.lessonType = 'comprehensive';
      aiContent.educationalLevel = this.extractGradeLevel(prompt);
      aiContent.subject = this.extractSubject(prompt);
      
      // Ensure comprehensive structure is present
      if (!aiContent.lessonOverview) {
        aiContent.lessonOverview = {
          objectives: ['Understand the basic concepts', 'Apply knowledge through activities'],
          duration: '45-60 minutes',
          gradeLevel: aiContent.educationalLevel,
          materials: ['Whiteboard', 'Handouts', 'Basic supplies']
        };
      }
      
      if (!aiContent.resources) {
        aiContent.resources = {
          books: ['Ask your librarian for age-appropriate books on this topic'],
          websites: ['Educational websites (teacher should verify current links)'],
          videos: ['Search for educational videos on this topic'],
          materials: ['Basic classroom supplies']
        };
      }
      
      if (!aiContent.assessmentIdeas) {
        aiContent.assessmentIdeas = [
          'Exit ticket with key concept questions',
          'Quick sketch or diagram of main ideas',
          'Verbal sharing in pairs or small groups'
        ];
      }
      
      if (!aiContent.extensionActivities) {
        aiContent.extensionActivities = [
          'Research project on related topics',
          'Create a presentation for younger students',
          'Design a creative project incorporating the concepts'
        ];
      }
      
      console.log('✨ Comprehensive teacher-ready lesson content generated');
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
   * Extract main topic from prompt
   */
  private extractTopicFromPrompt(prompt: string): string {
    const lower = prompt.toLowerCase();
    
    // Look for specific topics
    if (lower.includes('robot')) return 'Robotics';
    if (lower.includes('photosynthesis')) return 'Photosynthesis';
    if (lower.includes('solar system')) return 'Solar System';
    if (lower.includes('fraction')) return 'Fractions';
    if (lower.includes('addition') || lower.includes('subtraction')) return 'Basic Math Operations';
    if (lower.includes('dinosaur')) return 'Dinosaurs';
    if (lower.includes('weather')) return 'Weather';
    if (lower.includes('plant')) return 'Plants';
    if (lower.includes('animal')) return 'Animals';
    if (lower.includes('ocean')) return 'Ocean Life';
    if (lower.includes('space')) return 'Space Exploration';
    
    // Extract from common lesson patterns
    const patterns = [
      /about ([a-zA-Z\s]+)/,
      /on ([a-zA-Z\s]+)/,
      /lesson.*([a-zA-Z\s]+)/,
      /teach.*([a-zA-Z\s]+)/
    ];
    
    for (const pattern of patterns) {
      const match = prompt.match(pattern);
      if (match && match[1]) {
        return match[1].trim().replace(/\b\w/g, l => l.toUpperCase());
      }
    }
    
    // Default fallback
    return 'Educational Topic';
  }

  /**
   * Create comprehensive structured content from prompt
   * This creates a complete teacher-ready lesson even as fallback
   */
  private createContentStructure(prompt: string, options: SimplePDFOptions) {
    // Extract topic from prompt
    const topic = this.extractTopicFromPrompt(prompt);
    const subject = this.extractSubject(prompt);
    const gradeLevel = this.extractGradeLevel(prompt);
    
    // Create comprehensive lesson overview
    const lessonOverview = {
      objectives: this.generateLearningObjectives(topic, gradeLevel),
      duration: this.estimateLessonDuration(prompt),
      gradeLevel: gradeLevel,
      materials: this.generateMaterialsList(topic, subject)
    };
    
    // Create comprehensive sections
    const sections = [
      {
        heading: 'Lesson Overview & Objectives',
        content: this.formatLessonOverview(lessonOverview)
      },
      {
        heading: 'Background Knowledge for Teachers',
        content: this.generateTeacherBackground(topic, subject, gradeLevel)
      },
      {
        heading: 'Vocabulary & Key Terms',
        content: this.generateVocabulary(topic, subject, gradeLevel)
      },
      {
        heading: 'Main Lesson Content',
        content: this.generateMainContent(topic, subject, gradeLevel)
      },
      {
        heading: 'Teaching Strategies & Tips',
        content: this.generateTeachingStrategies(topic, subject, gradeLevel)
      },
      {
        heading: 'Hands-On Activities',
        content: this.generateHandsOnActivities(topic, subject, gradeLevel)
      },
      {
        heading: 'Discussion Questions',
        content: this.generateDiscussionQuestions(topic, subject, gradeLevel)
      },
      {
        heading: 'Cross-Curricular Connections',
        content: this.generateCrossCurricular(topic, subject)
      },
      {
        heading: 'Differentiation & Adaptations',
        content: this.generateDifferentiation(topic, gradeLevel)
      }
    ];
    
    // Generate comprehensive resources
    const resources = {
      books: this.generateBookRecommendations(topic, subject, gradeLevel),
      websites: this.generateWebsiteRecommendations(topic, subject),
      videos: this.generateVideoSuggestions(topic, subject, gradeLevel),
      materials: this.generateAdditionalMaterials(topic, subject)
    };
    
    // Generate assessment ideas
    const assessmentIdeas = this.generateAssessmentIdeas(topic, subject, gradeLevel);
    
    // Generate extension activities
    const extensionActivities = this.generateExtensionActivities(topic, subject, gradeLevel);
    
    return {
      title: `Comprehensive ${topic} Lesson - ${subject}`,
      lessonType: 'comprehensive',
      lessonOverview,
      sections,
      resources,
      assessmentIdeas,
      extensionActivities,
      gradeLevel,
      subject,
      educationalLevel: gradeLevel,
      generatedAt: new Date().toLocaleDateString(),
      aiGenerated: false // This is fallback content
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
   * Generate comprehensive learning objectives
   */
  private generateLearningObjectives(topic: string, gradeLevel: string): string[] {
    return [
      `Students will understand the basic concepts and principles of ${topic.toLowerCase()}`,
      `Students will identify key components and characteristics of ${topic.toLowerCase()}`,
      `Students will apply knowledge through hands-on activities and discussions`,
      `Students will make connections between ${topic.toLowerCase()} and real-world applications`
    ];
  }

  /**
   * Estimate lesson duration based on content complexity
   */
  private estimateLessonDuration(prompt: string): string {
    if (prompt.toLowerCase().includes('comprehensive') || prompt.toLowerCase().includes('detailed')) {
      return '60-90 minutes (can be split across multiple sessions)';
    }
    return '45-60 minutes';
  }

  /**
   * Generate materials list for the lesson
   */
  private generateMaterialsList(topic: string, subject: string): string[] {
    const baseMaterials = ['Whiteboard/markers', 'Paper and pencils', 'Student handouts'];
    
    if (subject === 'Science') {
      baseMaterials.push('Simple materials for experiments', 'Safety equipment if needed');
    } else if (subject === 'Mathematics') {
      baseMaterials.push('Calculators (if appropriate)', 'Manipulatives or visual aids');
    } else if (subject === 'Technology/Engineering') {
      baseMaterials.push('Basic building materials', 'Examples or models to show');
    }
    
    return baseMaterials;
  }

  /**
   * Format lesson overview for display
   */
  private formatLessonOverview(overview: any): string {
    return `**Learning Objectives:**
${overview.objectives.map((obj: string) => `• ${obj}`).join('\n')}

**Estimated Duration:** ${overview.duration}

**Grade Level:** ${overview.gradeLevel}

**Materials Needed:**
${overview.materials.map((mat: string) => `• ${mat}`).join('\n')}`;
  }

  /**
   * Generate teacher background knowledge
   */
  private generateTeacherBackground(topic: string, subject: string, gradeLevel: string): string {
    return `This section provides essential background knowledge for teaching about ${topic.toLowerCase()}.

**Key Points for Teacher Preparation:**
• Review the main concepts before class to ensure confidence in delivery
• Prepare answers to common student questions about ${topic.toLowerCase()}
• Understand age-appropriate explanations for ${gradeLevel} students
• Be ready to provide additional examples if students need clarification

**Subject Integration:**
This lesson connects to ${subject} standards and can be integrated with other subjects for cross-curricular learning.

**Common Student Misconceptions:**
• Students may initially find some concepts challenging
• Be prepared to break down complex ideas into simpler parts
• Use concrete examples that relate to students' experiences`;
  }

  /**
   * Generate vocabulary and key terms
   */
  private generateVocabulary(topic: string, subject: string, gradeLevel: string): string {
    const isElementary = gradeLevel.includes('Elementary') || gradeLevel.includes('Early');
    const complexityLevel = isElementary ? 'simple' : 'detailed';
    
    return `**Essential Vocabulary:**
Introduce these terms gradually throughout the lesson.

• **${topic}** - The main concept we're studying today
• **Example** - A specific case that shows how something works
• **Application** - How we use this knowledge in real life
• **Connection** - How this relates to other things we know

**Teaching Tips for Vocabulary:**
• Write terms on the board as you introduce them
• Have students repeat key words aloud
• Use visual aids or gestures when possible
• Connect new terms to students' prior knowledge
• Create a word wall for ongoing reference`;
  }

  /**
   * Generate main lesson content
   */
  private generateMainContent(topic: string, subject: string, gradeLevel: string): string {
    return `**Introduction Hook (5-10 minutes):**
Start with an engaging question: "What do you already know about ${topic.toLowerCase()}?"

**Core Content Delivery:**
Present the main concepts in age-appropriate language:

1. **Basic Definition and Overview**
   Explain what ${topic.toLowerCase()} is in simple terms that ${gradeLevel} students can understand.

2. **Key Characteristics and Features**
   Discuss the main aspects that make ${topic.toLowerCase()} important or interesting.

3. **Real-World Examples**
   Share concrete examples that students can relate to from their daily lives.

4. **Why This Matters**
   Help students understand why learning about ${topic.toLowerCase()} is valuable.

**Presentation Tips:**
• Use visual aids, diagrams, or props when possible
• Ask frequent check-for-understanding questions
• Encourage student participation and questions
• Break content into 5-7 minute chunks to maintain attention`;
  }

  /**
   * Generate teaching strategies
   */
  private generateTeachingStrategies(topic: string, subject: string, gradeLevel: string): string {
    return `**Effective Teaching Strategies:**

• **Think-Pair-Share:** Have students discuss concepts with a partner before sharing with the class
• **Visual Learning:** Use diagrams, charts, or images to support verbal explanations
• **Hands-On Learning:** Incorporate tactile experiences when possible
• **Questioning Techniques:** Use open-ended questions to promote critical thinking
• **Real-World Connections:** Help students see how ${topic.toLowerCase()} applies to their lives

**Engagement Techniques:**
• Start with a mystery or interesting fact to capture attention
• Use movement or gestures to help students remember concepts
• Incorporate games or friendly competitions when appropriate
• Allow time for student questions and exploration

**Differentiation Strategies:**
• Provide visual supports for visual learners
• Include hands-on activities for kinesthetic learners
• Offer both simple and complex examples
• Give extra processing time for students who need it`;
  }

  /**
   * Generate hands-on activities
   */
  private generateHandsOnActivities(topic: string, subject: string, gradeLevel: string): string {
    return `**Activity 1: Exploration Activity (15-20 minutes)**
Materials: Paper, pencils, basic supplies
Steps:
1. Students work in pairs to explore ${topic.toLowerCase()}
2. They create a simple diagram or drawing
3. Pairs share their discoveries with another pair
4. Groups present one interesting finding to the class

**Activity 2: Hands-On Investigation (15-20 minutes)**
Materials: Simple materials related to the topic
Steps:
1. Students follow guided steps to investigate a key concept
2. They record observations and results
3. Class discusses findings and what they learned
4. Connect results back to main lesson concepts

**Activity 3: Creative Application (10-15 minutes)**
Materials: Art supplies, writing materials
Steps:
1. Students choose how to show their understanding (draw, write, build)
2. They create something that demonstrates the key concepts
3. Gallery walk to see others' work
4. Brief sharing of creative applications

**Safety Notes:**
Ensure all activities are age-appropriate and safe for ${gradeLevel} students.`;
  }

  /**
   * Generate discussion questions
   */
  private generateDiscussionQuestions(topic: string, subject: string, gradeLevel: string): string {
    return `**Discussion Questions for Class Engagement:**

1. **Opening Question:** What do you think when you hear the word "${topic.toLowerCase()}"?

2. **Knowledge Check:** Can you explain ${topic.toLowerCase()} in your own words?

3. **Real-World Connection:** Where might you see or use ${topic.toLowerCase()} in everyday life?

4. **Comparison Question:** How is ${topic.toLowerCase()} similar to or different from [related concept]?

5. **Application Question:** If you were teaching a younger student about ${topic.toLowerCase()}, what would you say?

6. **Critical Thinking:** Why do you think ${topic.toLowerCase()} is important to learn about?

7. **Personal Connection:** How might learning about ${topic.toLowerCase()} help you in the future?

**Discussion Tips:**
• Give students think time before expecting answers
• Use pair-share before whole-class discussion
• Accept all reasonable responses and build on them
• Help students make connections between their ideas`;
  }

  /**
   * Generate cross-curricular connections
   */
  private generateCrossCurricular(topic: string, subject: string): string {
    const connections = [];
    
    if (subject !== 'Mathematics') {
      connections.push('**Mathematics:** Incorporate measuring, counting, or data collection related to the topic');
    }
    if (subject !== 'English Language Arts') {
      connections.push('**Reading/Writing:** Students can read additional texts or write about their learning');
    }
    if (subject !== 'Science') {
      connections.push('**Science:** Explore scientific aspects or conduct simple investigations');
    }
    if (subject !== 'Arts') {
      connections.push('**Arts:** Create visual representations, songs, or performances about the topic');
    }
    if (subject !== 'Social Studies') {
      connections.push('**Social Studies:** Discuss historical context or cultural connections');
    }
    
    connections.push('**Technology:** Use digital tools for research or presentation of findings');
    
    return connections.join('\n\n');
  }

  /**
   * Generate differentiation strategies
   */
  private generateDifferentiation(topic: string, gradeLevel: string): string {
    return `**Adaptations for Different Learning Needs:**

**For Advanced Learners:**
• Provide additional research opportunities
• Offer more complex examples or challenges
• Encourage them to help support other students
• Give extension activities that go deeper into the topic

**For Students Needing Extra Support:**
• Break instructions into smaller steps
• Provide visual aids and graphic organizers
• Offer additional practice time
• Use concrete examples and hands-on materials
• Allow alternative ways to demonstrate understanding

**For English Language Learners:**
• Use visual supports and gestures
• Provide key vocabulary in advance
• Allow extra processing time
• Encourage use of first language for initial understanding
• Pair with supportive bilingual peers when possible

**For Different Learning Styles:**
• Visual: Include diagrams, charts, and graphic organizers
• Auditory: Incorporate discussion, music, or verbal explanations
• Kinesthetic: Add movement, hands-on activities, and manipulatives`;
  }

  /**
   * Generate book recommendations
   */
  private generateBookRecommendations(topic: string, subject: string, gradeLevel: string): string[] {
    return [
      `Age-appropriate books about ${topic.toLowerCase()} (check your school library)`,
      `Picture books that introduce ${subject.toLowerCase()} concepts`,
      `Non-fiction books at appropriate reading level`,
      `Interactive books or books with activities related to the topic`,
      'Ask your librarian for current recommendations in this subject area'
    ];
  }

  /**
   * Generate website recommendations
   */
  private generateWebsiteRecommendations(topic: string, subject: string): string[] {
    return [
      'Educational websites (verify current links and age-appropriateness)',
      'Interactive online activities related to the topic',
      'Virtual field trips or online museums',
      'Teacher resource sites for additional activities',
      'Always preview websites before sharing with students'
    ];
  }

  /**
   * Generate video suggestions
   */
  private generateVideoSuggestions(topic: string, subject: string, gradeLevel: string): string[] {
    return [
      `Educational videos about ${topic.toLowerCase()} (age-appropriate)`,
      'Short documentary clips related to the subject',
      'Animation or cartoon explanations for younger students',
      'Virtual demonstrations or experiments',
      'Always preview videos before class and check audio levels'
    ];
  }

  /**
   * Generate additional teaching materials
   */
  private generateAdditionalMaterials(topic: string, subject: string): string[] {
    return [
      'Printable worksheets or graphic organizers',
      'Visual aids, posters, or charts',
      'Hands-on manipulatives or models',
      'Games or activities for reinforcement',
      'Assessment rubrics or checklists'
    ];
  }

  /**
   * Generate assessment ideas
   */
  private generateAssessmentIdeas(topic: string, subject: string, gradeLevel: string): string[] {
    return [
      'Exit ticket with 2-3 key questions about the lesson',
      'Quick sketch or diagram showing understanding of main concepts',
      'Verbal sharing in pairs followed by whole-class discussion',
      'Simple quiz or matching activity with key terms',
      'Hands-on demonstration of a concept learned',
      'Writing or drawing activity showing real-world applications',
      'Observation checklist during hands-on activities'
    ];
  }

  /**
   * Generate extension activities
   */
  private generateExtensionActivities(topic: string, subject: string, gradeLevel: string): string[] {
    return [
      `Research project exploring different aspects of ${topic.toLowerCase()}`,
      'Create a presentation to teach younger students about the topic',
      'Design a creative project (poster, model, story) incorporating key concepts',
      `Interview family members about their experiences with ${topic.toLowerCase()}`,
      'Start a class collection or display related to the subject',
      'Plan and conduct a simple investigation or experiment',
      'Write and illustrate a story or comic about the concepts learned'
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
    
    .lesson-meta {
      color: #4f46e5;
      font-size: 14px;
      font-weight: 500;
      margin-top: 8px;
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
    
    h3 {
      color: #374151;
      font-size: 16px;
      margin: 15px 0 8px 0;
      font-weight: 600;
    }
    
    .resources ul, .assessment ul, .extension ul {
      background: #f8fafc;
      padding: 15px 20px;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${content.title}</div>
    <div class="date">Generated on ${content.generatedAt}</div>
    ${content.lessonType === 'comprehensive' ? `<div class="lesson-meta">Grade Level: ${content.gradeLevel} | Subject: ${content.subject}</div>` : ''}
  </div>
  
  ${content.sections.map((section: any) => `
    <div class="section">
      <h2>${section.heading}</h2>
      <div>${this.formatContent(section.content)}</div>
    </div>
  `).join('')}
  
  ${content.resources ? `
    <div class="section">
      <h2>Resources & References</h2>
      <div>
        <h3>📚 Recommended Books:</h3>
        <ul>${content.resources.books.map((book: string) => `<li>${book}</li>`).join('')}</ul>
        
        <h3>🌐 Websites & Online Resources:</h3>
        <ul>${content.resources.websites.map((site: string) => `<li>${site}</li>`).join('')}</ul>
        
        <h3>📺 Video Resources:</h3>
        <ul>${content.resources.videos.map((video: string) => `<li>${video}</li>`).join('')}</ul>
        
        <h3>📋 Additional Materials:</h3>
        <ul>${content.resources.materials.map((material: string) => `<li>${material}</li>`).join('')}</ul>
      </div>
    </div>
  ` : ''}
  
  ${content.assessmentIdeas ? `
    <div class="section">
      <h2>Assessment Ideas</h2>
      <div>
        <ul>${content.assessmentIdeas.map((idea: string) => `<li>${idea}</li>`).join('')}</ul>
      </div>
    </div>
  ` : ''}
  
  ${content.extensionActivities ? `
    <div class="section">
      <h2>Extension Activities</h2>
      <div>
        <ul>${content.extensionActivities.map((activity: string) => `<li>${activity}</li>`).join('')}</ul>
      </div>
    </div>
  ` : ''}
  
  <div class="footer">
    Generated by Dash AI - EduDash Pro Educational Platform<br>
    ${content.aiGenerated ? 'Enhanced with AI-powered content generation' : 'Professional lesson template'}
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