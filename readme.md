
# Overview  
Prompt2Quiz is a web-based quiz generation platform that transforms any topic or textual prompt into a structured set of multiple-choice questions (MCQs).  
The system is designed for a wide range of users — students, educators, researchers, developers, or anyone looking to quickly generate topic-based quizzes.

It operates entirely through the browser and requires no installation, making it accessible across categories and devices.  

---

# User Guide  

  ## Home Page  
  <img src="https://drive.google.com/uc?export=view&id=1ARWqRpUaszf_cZhLtdznk_U0fZ0wTUO_" alt="Home Page">
  
  When users open the application, they are presented with a large input field.  
  They may type any topic they want a quiz on.  
  
  Example inputs:  
  - “Operating System Deadlocks”  
  - “Python Loops”  
  - “Climate Change Basics”  
  - “India After Independence”  
  
  You can enter **any topic**, and the application will generate questions for it.

---

  ## Expanded Options  
<img src="https://drive.google.com/uc?export=view&id=1d_88BV-_IvlQTp8kzNJBOKVzdgsGKQVa" alt="Home Page">

Users may expand the input panel to configure additional settings:  
- Number of questions  
- Difficulty level  
- AI model selection  
  - Visit the **Available Models** section for complete model details  

These settings allow deeper customization without forcing the user to understand the backend.

---

  ## Quiz Generation  
  Once the user clicks **Enter**, Prompt2Quiz builds a quiz that includes:  
  - Multiple-choice questions  
  - Several options  
  - Correct answers  
  - Clear explanations  
  
  This process happens automatically and quickly.
  
  ---
  
  ## Answering Questions  
  <img src="https://drive.google.com/uc?export=view&id=1_TgWxxWUpL551DwuleoqKL4mq29-HMad" alt="Problem">
  
  For each question:  
  1. The user selects an answer  
  2. Clicks **Submit**  
  3. The application immediately displays correctness  
  
  ### Google Search Popup  
  After submitting a question, a small popup appears on the **bottom-right corner**, allowing users to search the question directly on Google.  
  You can use this feature to further verify your answer.
  
  ---
  
  ## Results Page  
  <img src="https://drive.google.com/uc?export=view&id=1RYECqIDPDj8DTfKFy_-dQXJeEuEvomnv" alt="Home Page">

  Once all questions are completed:  
  - Users are redirected to a final results summary  
  - They can review all questions, their responses, and explanations  
  
  ---

# Available Models

The quiz generator offers three different models, each suited for a different type of quiz and level of complexity.

## Model 1 — Gemini 2.5 Flash
Fast and efficient. Produces good-quality questions quickly.  
Best for everyday quizzes and rapid practice.

- Typically generates **5–12 questions** per request  
- Questions are clear and concise  
- Explanations are short and to the point  

---

## Model 2 — Gemini 2.5 Pro
Stronger reasoning and more detailed structure.  
Best for technical subjects or exam-level quizzes.

- Typically generates **5–10 detailed questions**  
- Explanations are richer and more thorough  
- Handles complex topics more effectively  

---

## Model 3 — Gemini 2.5 Flash Lite
Lightweight version designed for simple or broad-topic quizzes.  
Best for basic learning or quick checks.

- Typically generates **3–6 simple questions**  
- Questions are short and direct  
- Minimal explanation detail  

---

# Which Model Should You Choose?

### Choose **Gemini 2.5 Flash** if:
- You want quick, good-quality quizzes  
- You prefer short explanations  
- You need a balanced model for general topics  

### Choose **Gemini 2.5 Pro** if:
- You need accurate, exam-level questions  
- Your topic is technical or requires in-depth understanding  
- You want higher reasoning quality  

### Choose **Gemini 2.5 Flash Lite** if:
- You want very simple, short quizzes  
- You're exploring a broad or basic topic  
- You prefer fast generation with minimal detail
---
# FAQ  

### **Q1. Can the app generate quizzes from large text paragraphs?**  
Yes. The system accepts short topics, long paragraphs, and descriptive prompts.

### **Q2. Are all questions multiple-choice based?**  
Yes. MCQs ensure consistency and ease of evaluation.

### **Q3. Do I need an account to use the application?**  
No. Everything works without sign-up.

### **Q4. Can I adjust how difficult the quiz is?**  
Yes. Difficulty settings are available in the expanded section.

### **Q5. Can I review my answers after completing the quiz?**  
Absolutely. The results page includes a complete review panel.

---

# Troubleshooting  

### **1. The quiz isn’t generating.**  
- Check if the prompt field is empty  
- Try reducing the number of questions  

### **2. The Google search popup isn’t showing.**  
- Ensure that JavaScript is enabled in the browser  
- Refresh the page after submitting an answer  

### **3. I’m seeing repeated questions.**  
- Try switching AI models  
- Adjust the difficulty  
- Provide a more specific topic


# Handling Quiz Generation Errors (HTTP 500)

Occasionally, you may encounter an **“Internal Server Error (HTTP 500)”** while generating a quiz. This is a temporary issue and does not indicate a problem with your device or setup.

## Why It Happens
A 500 error simply means the quiz service was unable to complete your request at that moment. This can occur if the prompt is unusually detailed or if the service experiences a brief slowdown.

## What You Can Do

### 1. Try Again After a Short Pause
Wait a few seconds and retry the same request.  
Most interruptions resolve quickly.

### 2. Simplify the Prompt
If the error repeats, try reducing the length or complexity of your prompt.

## If the Issue Continues
The service may be temporarily overloaded. Trying again later usually resolves the problem.

If the error persists even with simple prompts, you can **report it through the app’s bug report section** so it can be reviewed.

---

# Future Improvements
## User Accounts (Email + Password)

A full authentication system is planned, allowing users to create accounts, sign in securely, and keep their preferences intact across sessions. This will make the experience more personal and allow users to return to their work at any time.

## Quiz History

After accounts are introduced, users will be able to view all their past quizzes in one place. The history section will include topics, scores, difficulty levels, and the option to re-open or re-attempt previous quizzes. It’s intended to give learners a clear record of their progress.

---

# End of Documentation  
For further enhancements or integrations, feel free to extend or modify this base system.

