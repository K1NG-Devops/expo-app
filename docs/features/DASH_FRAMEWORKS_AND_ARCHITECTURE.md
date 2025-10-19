# Dash AI - Frameworks & Architecture Enhancement

**Date:** 2025-10-19  
**Purpose:** Comprehensive guide to frameworks that can enhance Dash AI capabilities

---

## 🎯 Overview

Dash AI can be enhanced with various frameworks for:
1. **Memory & Knowledge** - Long-term memory, RAG systems
2. **Reasoning & Planning** - Multi-step reasoning, decision making
3. **Tool Use** - Function calling, external integrations
4. **Multi-Agent** - Collaborative AI agents
5. **Orchestration** - Workflow management

---

## 📚 Category 1: Memory & Knowledge Frameworks

### 1.1 **LangChain** ⭐ HIGHLY RECOMMENDED

**Purpose:** Complete framework for LLM applications with memory, tools, chains

**What It Provides:**
- ✅ Memory systems (conversation history, entity memory, summary memory)
- ✅ Document loaders (PDF, web, database)
- ✅ Vector store integrations (Supabase pgvector!)
- ✅ RAG (Retrieval Augmented Generation)
- ✅ Agent framework
- ✅ Tool/function calling
- ✅ Chain-of-thought reasoning

**Perfect For Dash:**
```typescript
import { ChatAnthropic } from "@langchain/anthropic";
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase";
import { ConversationBufferMemory } from "langchain/memory";

// Dash with LangChain memory
const memory = new ConversationBufferMemory({
  returnMessages: true,
  memoryKey: "chat_history",
});

const capsVectorStore = await SupabaseVectorStore.fromExistingIndex(
  embeddings,
  {
    client: supabase,
    tableName: "caps_content_chunks",
    queryName: "match_documents",
  }
);

// RAG chain for CAPS curriculum
const chain = ConversationalRetrievalQAChain.fromLLM(
  new ChatAnthropic({ modelName: "claude-3-5-sonnet-20241022" }),
  capsVectorStore.asRetriever(),
  { memory }
);

// Dash answers with CAPS context
const response = await chain.call({
  question: "Create a Grade 10 math lesson on quadratic equations"
});
```

**Installation:**
```bash
npm install langchain @langchain/anthropic @langchain/community
```

**Effort:** 3-5 days integration  
**Cost:** $0 (open source)

---

### 1.2 **LlamaIndex** ⭐ ALTERNATIVE TO LANGCHAIN

**Purpose:** Data framework for LLM applications, RAG specialist

**What It Provides:**
- ✅ Advanced RAG patterns
- ✅ Index management (vector, keyword, hybrid)
- ✅ Query engines
- ✅ Document parsing (PDF, docx, etc.)
- ✅ Multi-document reasoning

**Perfect For:**
- Complex curriculum document relationships
- Hybrid search (semantic + keyword)
- Multi-hop reasoning across documents

**Effort:** 3-5 days  
**Cost:** $0

---

### 1.3 **Mem0 (Memory for AI)** 🆕 SPECIALIZED

**Purpose:** Persistent memory layer for AI agents

**What It Provides:**
- ✅ User memory (preferences, history)
- ✅ Entity memory (relationships)
- ✅ Semantic memory (concepts, facts)
- ✅ Memory decay/reinforcement
- ✅ Cross-session persistence

**Perfect For:**
- Remembering each teacher's preferences
- Learning patterns over time
- Personalized responses

```typescript
import { MemoryClient } from "mem0ai";

const memory = new MemoryClient();

// Store memory
await memory.add({
  messages: [{ role: "user", content: "I teach Grade 10 Math" }],
  user_id: teacherId
});

// Retrieve relevant memories
const relevantMemories = await memory.search({
  query: "What subjects does this teacher teach?",
  user_id: teacherId
});
```

**Effort:** 2-3 days  
**Cost:** Free tier available

---

## 🧠 Category 2: Reasoning & Planning Frameworks

### 2.1 **AutoGPT / BabyAGI Patterns**

**Purpose:** Autonomous task completion with planning

**What It Does:**
- Break complex goals into sub-tasks
- Execute tasks in sequence
- Learn from results
- Adjust plans dynamically

**For Dash:**
```typescript
// "Create a complete curriculum unit"
// AutoGPT breaks down into:
// 1. Search CAPS requirements
// 2. Create lesson plans (5 lessons)
// 3. Generate worksheets
// 4. Create assessment
// 5. Generate rubrics
// 6. Package as PDF
```

**Effort:** 5-7 days  
**Cost:** $0 (pattern/architecture)

---

### 2.2 **Chain-of-Thought (CoT) Prompting**

**Purpose:** Multi-step reasoning

**Implementation:**
```typescript
// Built into Anthropic Claude with extended_thinking
const response = await anthropic.messages.create({
  model: "claude-3-5-sonnet-20241022",
  messages: [{
    role: "user",
    content: "Think step-by-step to solve this calculus problem..."
  }],
  thinking: {
    type: "enabled",
    budget_tokens: 2000
  }
});
```

**Effort:** 1 day (just prompting)  
**Cost:** $0

---

### 2.3 **ReACT (Reasoning + Acting)**

**Purpose:** Think -> Act -> Observe loop

**Pattern:**
```
User: "Find past papers on trigonometry"

Thought: I should search CAPS past papers
Action: search_caps_curriculum(query="trigonometry", type="exam")
Observation: Found 12 papers from 2020-2024

Thought: I should filter for recent years
Action: filter_by_year(papers, years=[2022,2023,2024])
Observation: 5 papers from recent years

Response: Here are 5 recent trigonometry exam papers...
```

**Already in your DashToolRegistry!** ✅

---

## 🔧 Category 3: Tool Use & Integration Frameworks

### 3.1 **Anthropic Function Calling** ⭐ CURRENT

**What You Have:**
- Tool definitions in DashToolRegistry
- AI calls tools automatically
- Results fed back to AI

**Enhancement:**
- Add more tools (we designed 22!)
- Tool chaining (one tool's output → next tool's input)
- Parallel tool execution

**Effort:** Ongoing (add tools as needed)

---

### 3.2 **Vercel AI SDK** 🆕 EXCELLENT

**Purpose:** Unified interface for AI models + tools

**What It Provides:**
- ✅ Streaming responses
- ✅ Tool calling (standard interface)
- ✅ React hooks for UI
- ✅ Multi-provider support (Anthropic, OpenAI, etc.)
- ✅ Edge function compatible

```typescript
import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const result = await generateText({
  model: anthropic('claude-3-5-sonnet-20241022'),
  tools: {
    searchCAPS: {
      description: 'Search CAPS curriculum',
      parameters: z.object({
        query: z.string(),
        grade: z.string(),
      }),
      execute: async ({ query, grade }) => {
        return await searchCapsDatabase(query, grade);
      },
    },
  },
  prompt: 'Find Grade 10 math curriculum on quadratics',
});
```

**Effort:** 2-3 days  
**Cost:** $0 (open source)

---

### 3.3 **LangChain Tools/Agents**

Already covered above, but specifically:
- **SerpAPI** - Google search
- **Wikipedia** - General knowledge
- **Calculator** - Math calculations
- **WebBrowser** - Web scraping
- **Custom tools** - Your CAPS tools!

---

## 🤝 Category 4: Multi-Agent Frameworks

### 4.1 **LangGraph** ⭐ POWERFUL

**Purpose:** Build stateful multi-agent applications

**What It Does:**
- Define agent workflows as graphs
- Agents can call other agents
- Conditional routing
- State management

**For Dash:**
```typescript
// Multi-agent workflow
const workflow = new StateGraph({
  // Agent 1: Curriculum Specialist
  curriculumAgent: searchCAPSandAnalyze,
  
  // Agent 2: Lesson Planner
  lessonAgent: createLessonPlan,
  
  // Agent 3: Assessment Creator
  assessmentAgent: generateAssessment,
  
  // Agent 4: Quality Checker
  reviewAgent: checkCAPSAlignment,
});

// Flow: User Request → Curriculum → Lesson → Assessment → Review → User
workflow.addEdge("curriculumAgent", "lessonAgent");
workflow.addEdge("lessonAgent", "assessmentAgent");
workflow.addEdge("assessmentAgent", "reviewAgent");
```

**Effort:** 5-7 days  
**Cost:** $0

---

### 4.2 **CrewAI**

**Purpose:** Role-based AI agent teams

**Concept:**
```typescript
// Create specialized agents
const researcher = new Agent({
  role: "CAPS Curriculum Researcher",
  goal: "Find relevant curriculum content",
  backstory: "Expert in South African CAPS curriculum",
  tools: [searchCAPS, analyzeCurriculum]
});

const teacher = new Agent({
  role: "Lesson Plan Creator",
  goal: "Create engaging lesson plans",
  backstory: "20 years teaching experience",
  tools: [createLesson, generateWorksheet]
});

const reviewer = new Agent({
  role: "Quality Assurance",
  goal: "Ensure CAPS alignment",
  backstory: "DBE curriculum advisor",
  tools: [checkAlignment, validateContent]
});

// They collaborate on tasks
const crew = new Crew({
  agents: [researcher, teacher, reviewer],
  tasks: [researchTask, createTask, reviewTask],
  process: "sequential"
});
```

**Effort:** 7-10 days  
**Cost:** $0

---

## 🎼 Category 5: Orchestration & Workflow

### 5.1 **Temporal.io**

**Purpose:** Durable workflow engine

**Use Case:**
- Long-running processes (generate full curriculum unit)
- Resumable workflows (if error, resume from checkpoint)
- Scheduled tasks (weekly curriculum updates)

**Effort:** 10-14 days  
**Cost:** Free tier available

---

### 5.2 **BullMQ / Redis Queues**

**Purpose:** Job queue for background tasks

**Use Cases:**
- PDF generation queue
- Batch document processing
- Scheduled reports

**Effort:** 3-5 days  
**Cost:** Redis hosting ($10-20/month)

---

## 📊 Recommended Priority for Dash

### **Phase 1: Essential (Do First)** 🔴

1. **LangChain Memory** (3 days, $0)
   - Add conversation memory
   - Entity memory (remember students, classes)
   - Summary memory (long conversations)

2. **Enhanced Tool Registry** (2 days, $0)
   - Add CAPS search tools
   - Add organization data tools (✅ already done!)
   - Tool chaining

**Total:** 5 days, immediate value

---

### **Phase 2: Knowledge (Do Next)** 🟡

3. **RAG with LangChain/LlamaIndex** (5 days, $0)
   - CAPS vector search
   - Hybrid search (semantic + keyword)
   - Multi-document reasoning

4. **Mem0 Persistent Memory** (3 days, $0)
   - Per-user memory
   - Learning over time
   - Preference tracking

**Total:** 8 days, huge value

---

### **Phase 3: Advanced (Later)** 🟢

5. **LangGraph Multi-Agent** (7 days, $0)
   - Specialist agents
   - Complex workflows
   - Quality assurance

6. **Vercel AI SDK** (3 days, $0)
   - Better streaming
   - Unified interface
   - React hooks

**Total:** 10 days, professional-grade

---

## 🎯 Specific Recommendation for Your CAPS Use Case

### **CAPS-Optimized Stack:**

```
1. Memory Layer: LangChain + Mem0
   ↓
2. Knowledge Base: CAPS database + pgvector
   ↓
3. Retrieval: LangChain RAG
   ↓
4. Reasoning: Claude 3.5 Sonnet with extended_thinking
   ↓
5. Tools: DashToolRegistry (enhanced)
   ↓
6. Response: Streaming via Vercel AI SDK
```

**Implementation Time:** 15 days  
**Cost:** $0 + embedding costs (~$20 one-time)  
**Result:** World-class CAPS-aware AI assistant

---

## 💡 Quick Wins You Can Do Now

### **This Week (No Framework Needed):**

1. ✅ **Conversation Buffer** (1 day)
```typescript
// Simple in-memory conversation history
class DashConversationMemory {
  private history: Map<string, Message[]> = new Map();
  
  add(userId: string, message: Message) {
    if (!this.history.has(userId)) {
      this.history.set(userId, []);
    }
    this.history.get(userId)!.push(message);
    
    // Keep last 10 messages
    if (this.history.get(userId)!.length > 10) {
      this.history.get(userId)!.shift();
    }
  }
  
  get(userId: string): Message[] {
    return this.history.get(userId) || [];
  }
}
```

2. ✅ **Context Builder** (1 day)
```typescript
// Enhanced context for AI
function buildDashContext(userId: string, query: string) {
  const user = getUserProfile(userId);
  const memory = conversationMemory.get(userId);
  const caps = searchCAPSRelevant(query, user.grade, user.subject);
  
  return `
User Context:
- Role: ${user.role}
- Grade: ${user.grade}
- Subject: ${user.subject}
- Recent topics: ${memory.map(m => m.topic).join(', ')}

CAPS Context:
${caps.map(c => c.content).join('\n')}

Query: ${query}
  `;
}
```

3. ✅ **Tool Chaining** (2 days)
```typescript
// Let tools call other tools
async function executeToolChain(toolName: string, args: any) {
  const result = await toolRegistry.execute(toolName, args);
  
  // If result contains next_tool, execute it
  if (result.next_tool) {
    return await executeToolChain(result.next_tool, result.next_args);
  }
  
  return result;
}
```

**Total:** 4 days, massive improvement, $0

---

## 🎉 Summary

### **Can Add Today (Simple):**
- Conversation memory ✅
- Better context building ✅
- Tool chaining ✅

### **Should Add This Month (Medium):**
- LangChain memory system ⭐
- CAPS RAG integration ⭐
- Enhanced tool registry ⭐

### **Nice to Have Later (Complex):**
- Multi-agent system
- LangGraph workflows
- Vercel AI SDK

---

## 📦 Package.json Additions

```json
{
  "dependencies": {
    // Essential
    "langchain": "^0.1.0",
    "@langchain/anthropic": "^0.1.0",
    "@langchain/community": "^0.0.40",
    
    // Vector & Embeddings
    "@supabase/supabase-js": "^2.39.0",
    
    // Tools & Utilities
    "zod": "^3.22.0",
    "ai": "^3.0.0",  // Vercel AI SDK
    
    // Optional
    "mem0ai": "^0.1.0",  // If using Mem0
    "bull": "^4.11.0"    // If using queues
  }
}
```

---

## 🚀 Next Steps

1. ✅ **This week:** Simple conversation memory + context builder
2. ✅ **Next week:** LangChain integration
3. ✅ **Month 1:** Full RAG with CAPS
4. ⏳ **Month 2:** Multi-agent if needed

**The frameworks are tools - use them when they solve real problems, not because they're trendy!** 🎯
