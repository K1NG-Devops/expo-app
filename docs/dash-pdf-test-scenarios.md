# Dash PDF Generation - Test Scenarios

## How to Test the Fix

### Setup
1. Start the development server: `npm run start`
2. Open the app on web (Linux/Kali) or Android device
3. Navigate to Dash AI Assistant (chat icon)
4. Ensure you're logged in as a teacher or principal

---

## Test Scenario 1: Math Test Generation

### Input (Type or Voice)
```
"Create a simple math test for 5-year-olds with 10 questions"
```

### Expected AI Response
```
📚 Math Test for 5-Year-Olds

Instructions: Answer the following questions to practice your counting and number skills!

1. Count the apples: 🍎🍎🍎
   How many apples are there?
   a) 2
   b) 3
   c) 4
   Answer: ___

2. What number comes after 5?
   a) 4
   b) 6
   c) 7
   Answer: ___

3. Simple addition: 2 + 1 = ?
   a) 2
   b) 3
   c) 4
   Answer: ___

[... 7 more questions ...]

✅ You can export this test as a PDF for printing!
```

### Expected UI Behavior
- PDF export button appears below the response
- Button labeled "Export PDF" or similar
- Clicking button downloads file named "Math Test.pdf"

---

## Test Scenario 2: Science Worksheet

### Input
```
"Generate a science worksheet about animals for preschoolers"
```

### Expected AI Response
```
🦁 Animals Science Worksheet

Let's learn about animals!

1. Circle the animals that live in water:
   - Dog
   - Fish
   - Cat
   - Duck

2. Draw a line to match the animal to its home:
   Bird     →     Den
   Bear     →     Nest
   Fish     →     Water

3. Which animal says "Meow"?
   a) Dog
   b) Cat
   c) Cow
   Answer: ___

[... more questions ...]

📄 Ready to print? Export this as a PDF below!
```

### Expected UI Behavior
- PDF export button appears
- Button downloads "Science Worksheet.pdf"
- Content formatted for printing

---

## Test Scenario 3: Reading Practice

### Input
```
"I need reading practice activities for 4-year-olds"
```

### Expected AI Response
```
📖 Reading Practice Activities

Fun activities for young learners!

**Activity 1: Letter Recognition**
Circle the letter 'A' in the pictures below:
- Apple
- Ball
- Ant
- Cat

**Activity 2: Rhyming Words**
Draw lines to connect rhyming words:
Cat     →     Hat
Dog     →     Frog
Sun     →     Fun

**Activity 3: Beginning Sounds**
What sound does each picture start with?
1. 🐱 Cat starts with: ___
2. 🐕 Dog starts with: ___
3. ⚽ Ball starts with: ___

[... more activities ...]

💡 Download this as a PDF to use in your classroom!
```

### Expected UI Behavior
- PDF export automatically triggered
- Downloads as "Reading Practice.pdf"

---

## Test Scenario 4: Explicit PDF Request

### Input
```
"Export the last response as PDF"
```

### Expected AI Response
```
I'll prepare that for you to export as a PDF!

[Previous content is included in PDF]
```

### Expected UI Behavior
- PDF export button appears
- Uses generic title "Dash Export.pdf"

---

## Test Scenario 5: Complex Request with Voice

### Input (Voice Command)
```
"Hey Dash, create a worksheet with 15 addition problems for grade 1 students"
```

### Expected AI Response
```
➕ Addition Practice Worksheet - Grade 1

Instructions: Solve each addition problem. Show your work!

1. 2 + 3 = ___
2. 1 + 4 = ___
3. 5 + 2 = ___
4. 3 + 3 = ___
5. 4 + 1 = ___
6. 2 + 2 = ___
7. 1 + 5 = ___
8. 3 + 4 = ___
9. 5 + 1 = ___
10. 2 + 4 = ___
11. 3 + 2 = ___
12. 1 + 6 = ___
13. 4 + 3 = ___
14. 2 + 5 = ___
15. 3 + 5 = ___

Great job! You can print this worksheet below.
```

### Expected UI Behavior
- Transcript appears showing voice input
- AI response with all 15 problems
- PDF button labeled "Export PDF"
- Downloads as "Math Worksheet.pdf"

---

## Validation Checklist

### ✅ Content Generation
- [ ] AI generates actual educational content (not just suggestions)
- [ ] Content is appropriate for target age group
- [ ] Questions are numbered and structured clearly
- [ ] Instructions are included in the response
- [ ] Content length is substantial (200+ characters)

### ✅ PDF Export Functionality
- [ ] PDF export button appears automatically
- [ ] Button is visible and clickable
- [ ] PDF filename is meaningful (e.g., "Math Test.pdf")
- [ ] PDF contains all generated content
- [ ] PDF is properly formatted for printing

### ✅ Voice Integration
- [ ] Voice commands trigger the same behavior
- [ ] Transcription shows correctly
- [ ] Generated content matches voice request
- [ ] PDF export works with voice-initiated requests

### ✅ Cross-Platform Compatibility
- [ ] Works on web (Linux/Kali environment)
- [ ] Works on Android physical device
- [ ] Works on iOS (if available)
- [ ] PDF downloads correctly on each platform

### ✅ Edge Cases
- [ ] Short requests still generate content
- [ ] Complex multi-subject requests handled properly
- [ ] Explicit PDF requests work without content generation
- [ ] Handles requests in different languages (if supported)

---

## Troubleshooting

### Issue: PDF Button Not Appearing
**Possible Causes:**
- AI didn't generate enough content (less than 200 chars)
- Content doesn't match expected patterns (no numbered items)
- Request keywords not recognized (test, worksheet, practice, etc.)

**Solution:**
- Be more specific in request
- Use keywords like "test", "worksheet", "practice"
- Ask for specific number of questions

### Issue: PDF Export Fails
**Possible Causes:**
- Browser/device permissions not granted
- Storage access denied
- PDF service not initialized

**Solution:**
- Check browser console for errors
- Verify device storage permissions
- Restart the app and try again

### Issue: Content Not Age-Appropriate
**Possible Causes:**
- AI misunderstood age group
- Request wasn't specific enough

**Solution:**
- Specify age/grade level explicitly
- Use terms like "preschool", "5-year-olds", "grade 1"
- Provide more context in the request

---

## Next Steps After Testing

1. **If tests pass**: Deploy to production
2. **If issues found**: Document and report
3. **User feedback**: Monitor analytics for PDF download rates
4. **Improvements**: Track which subjects/types are most requested

---

**Document Created**: 2025-01-XX  
**Last Updated**: 2025-01-XX  
**Tester**: [Your Name]  
**Environment**: Development/Web
