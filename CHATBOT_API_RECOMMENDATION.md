# Vetrix Chatbot API Recommendation

## Recommended API

Use the OpenAI Responses API for the future Vetrix client chatbot.

Why it fits this system:

- The current PHP website already has a chatbot endpoint pattern: `vet_clinic/api/chatbot.php`.
- The mobile app can safely call a PHP endpoint instead of calling the AI provider directly.
- PHP can attach Vetrix context such as pet name, species, breed, age, weight, allergies, critical notes, appointments, and recent records.
- The chatbot can return short, structured guidance with triage labels, follow-up questions, and a safety note.
- API keys stay on the server and are never exposed inside Expo.

## Recommended Future Flow

```text
Expo mobile app
  -> POST /api/mobile_chatbot.php
      message
      selected_pet_id
      client_id from authenticated session

PHP endpoint
  -> verifies client owns the pet
  -> loads safe pet context from MySQL
  -> calls OpenAI Responses API
  -> returns JSON to mobile:
      answer
      triage
      follow_up_questions
      safety_note
      optional_research_links
```

## Do Not Do Yet

- Do not put the OpenAI API key in React Native.
- Do not call OpenAI directly from Expo Go.
- Do not expose full medical records to the model unless the client owns the pet and the clinic allows it.
- Do not let the chatbot diagnose or replace a veterinarian.

## Current Mobile App Status

The current React Native chatbot is still mock/static only.

It adapts the website simulator prompts:

- Dog vomiting
- Cat sneezing
- Vaccine side effects

It also mirrors the existing website chatbot behavior:

- Triage level
- Follow-up questions
- General pet-care guidance
- Safety note
- Pet context if the user mentions a mock pet name

## Alternative API

Google Dialogflow CX is also trusted and useful if Vetrix needs a strict flow-based chatbot with predefined clinic conversation paths. For this project, OpenAI is a better first choice because the existing system already supports free-text pet symptom guidance.
