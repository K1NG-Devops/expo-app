# Git-Style Diff: DashAIAssistant.ts Changes

```diff
--- services/DashAIAssistant.ts (BEFORE)
+++ services/DashAIAssistant.ts (AFTER)
@@ -567,10 +567,8 @@
   private currentConversationId: string | null = null;
   private memory: Map<string, DashMemoryItem> = new Map();
   private personality: DashPersonality = DEFAULT_PERSONALITY;
   private isRecording = false;
-  private recordingObject: any = null;
-  private soundObject: any = null;
   private audioPermissionStatus: 'unknown' | 'granted' | 'denied' = 'granted';
-  private audioPermissionLastChecked: number = 0;
   private readonly PERMISSION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
   
   // Enhanced agentic capabilities

@@ -676,7 +674,6 @@
   private async checkAudioPermission(): Promise<boolean> {
     // Local mic recording has been removed; streaming path manages permissions itself
     this.audioPermissionStatus = 'granted';
-    this.audioPermissionLastChecked = Date.now();
     return true;
   }

@@ -686,7 +683,6 @@
   private async requestAudioPermission(): Promise<boolean> {
     // Local mic recording removed; return true and let streaming/WebRTC handle prompts
     this.audioPermissionStatus = 'granted';
-    this.audioPermissionLastChecked = Date.now();
     return true;
   }

@@ -716,7 +712,9 @@
     await this.saveConversation(conversation);
     try {
       await AsyncStorage.setItem(DashAIAssistant.CURRENT_CONVERSATION_KEY, conversationId);
-    } catch {}
+    } catch (error) {
+      console.warn('[Dash] Failed to save conversation ID to storage:', error);
+    }
     return conversationId;
   }

@@ -774,7 +772,9 @@
           try { await this.createReminder(title, when, act?.payload || {}); } catch (e) { console.warn('[Dash] createReminder failed:', e); }
         }
       }
-    } catch {}
+    } catch (error) {
+      console.warn('[Dash] Failed to handle dashboard action:', error);
+    }

@@ -787,7 +787,9 @@
           try { await this.createReminder(title, iso, { source: 'nlp' }); } catch (e) { console.warn('[Dash] NL reminder failed:', e); }
         }
       }
-    } catch {}
+    } catch (error) {
+      console.warn('[Dash] Failed to create natural language reminder:', error);
+    }

@@ -797,7 +799,9 @@
       await this.syncContextAfterTurn({
         detectedLanguage: assistantResponse?.metadata?.detected_language as any,
         sessionId: convId,
       });
-    } catch {}
+    } catch (error) {
+      console.warn('[Dash] Failed to sync context to backend:', error);
+    }

@@ -1155,11 +1157,11 @@
 
     // Duration: handle "one and a half hours", "half an hour", "90-minute"
     let durationMins: number | null = null;
-const numMatch = fullText.match(/(\\d{1,3})\\s*-?\\s*(?:minute|min)s?\\b/i);
+    const numMatch = fullText.match(/(\d{1,3})\s*-?\s*(?:minute|min)s?\b/i);
     const hourMatch = fullText.match(/(\d(?:\.\d)?)\s*(?:hour|hr)s?/i);

@@ -1167,7 +1169,7 @@
 
     // Objectives: capture bullet points and sentences
-const lines = fullTextRaw.split(/\\n|;|•|-/).map(s => s.trim()).filter(Boolean);
+    const lines = fullTextRaw.split(/\n|;|•|-/).map(s => s.trim()).filter(Boolean);
     const objectiveCandidates: string[] = [];

@@ -5924,7 +5926,9 @@
     // Heuristic language detection for typed/streamed text to inform TTS of the next assistant reply
     let detectedLang: 'en' | 'af' | 'zu' | 'xh' | 'nso' = 'en';
     try {
       detectedLang = this.detectLikelyAppLanguageFromText(content);
-    } catch {}
+    } catch (error) {
+      console.warn('[Dash] Failed to detect language from text:', error);
+    }
```

---

## Summary of Changes

**Total Lines Changed:** 23 lines  
**Additions:** +13 lines (error logging)  
**Deletions:** -10 lines (unused variables + empty catches)

### Files Modified:
- `services/DashAIAssistant.ts` (1 file)

### Change Breakdown:
1. **Removed 3 unused variables** (-3 lines)
2. **Fixed 2 regex bugs** (2 lines modified)
3. **Added error logging to 5 catch blocks** (+10 lines)
4. **Removed 2 unnecessary timestamp updates** (-2 lines)

---

## How to Apply These Changes

If you're manually reviewing:

1. Search for `recordingObject` → Delete the line
2. Search for `soundObject` → Delete the line
3. Search for line 1157 → Fix the regex pattern
4. Search for line 1171 → Fix the split regex
5. Search for empty `} catch {}` blocks → Add error logging

All changes have already been applied to the repository! ✅
