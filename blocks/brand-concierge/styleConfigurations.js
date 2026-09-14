window.styleConfiguration = {
  "id": "a3d78467-9284-410a-85c5-89e3e5ecf12b",
  "name": "VA.GOV_26-09-03_a3d78467-9284-410a-85c5-89e3e5ecf12b",
  "metadata": {
    "brandName": "VA.GOV",
    "version": "1.0.0",
    "language": "en",
    "namespace": "brand-concierge"
  },
  "behavior": {
    "multimodalCarousel": {
      "cardClickAction": "openLink"
    },
    "input": {
      "enableVoiceInput": false,
      "continuousVoiceMode": false,
      "disableMultiline": true,
      "showAiChatIcon": {
        "icon": ""
      }
    },
    "chat": {
      "messageAlignment": "normal",
      "messageWidth": "100%"
    },
    "privacyNotice": {
      "title": "Privacy Notice",
      "text": "Your use of this automated chatbot constitutes your consent that the personal information you provide in the chat session can be collected, used, disclosed, and retained by VA.gov and service providers acting on VA.gov's behalf in accordance with the VA.gov {Privacy Policy}. Please do not provide sensitive personal information (such as financial or health information) in the chatbot.",
      "links": [
        {
          "text": "Privacy Policy",
          "url": "https://www.adobe.com"
        }
      ]
    },
    "meetingForm": {
      "fieldsPerRow": 2,
      "fieldLayoutRules": {
        "textInputs": {
          "allowTwoColumns": true,
          "fieldTypes": [
            "string",
            "email",
            "tel",
            "number"
          ],
          "identifyBy": null
        },
        "dropdowns": {
          "allowTwoColumns": false,
          "fieldTypes": [
            "select"
          ],
          "identifyBy": "hasOptions"
        },
        "checkboxes": {
          "allowTwoColumns": false,
          "fieldTypes": [
            "boolean",
            "checkbox"
          ],
          "identifyBy": null
        }
      },
      "title": {
        "text": "Schedule a Meeting",
        "alignment": "left"
      },
      "subtitle": {
        "text": "Connect with VA representatives to discuss your benefits and care.",
        "alignment": "left"
      },
      "buttons": {
        "submit": {
          "text": "Schedule Now",
          "alignment": "left"
        },
        "cancel": {
          "text": "Cancel",
          "alignment": "left"
        }
      }
    },
    "calendarWidget": {
      "title": {
        "text": "Select a Date and Time",
        "alignment": "left"
      },
      "subtitle": {
        "text": "Choose a convenient time to meet with VA representatives.",
        "alignment": "left"
      },
      "postTitle": {
        "text": "Once confirmed, you will receive a calendar invite with all the details. The specialist will already have this conversation context, so no need to repeat anything. Looking forward to connecting you with the right expert!",
        "alignment": "left"
      },
      "buttons": {
        "confirm": {
          "text": "Confirm Appointment",
          "alignment": "left"
        },
        "cancel": {
          "text": "Cancel",
          "alignment": "left"
        }
      }
    },
    "productCard": {
      "actionButtonSize": "S"
    },
    "b2bLiveChat": {
      "enabled": true
    }
  },
  "disclaimer": {
    "text": "VA.gov is a service of the U.S. Department of Veterans Affairs. {Terms}",
    "links": [
      {
        "text": "Terms of Use",
        "url": "https://www.va.gov/terms-of-use/"
      }
    ]
  },
  "text": {
    "welcome.heading": "Welcome to VA.gov",
    "welcome.subheading": "Your trusted resource for VA benefits and health care.",
    "input.placeholder": "Search for benefits, health care, or services",
    "input.messageInput.aria": "Type your message here",
    "input.send.aria": "Send message",
    "input.aiChatIcon.tooltip": "Chat with VA",
    "input.mic.aria": "Start voice input",
    "card.aria.select": "Select this option",
    "carousel.prev.aria": "Previous",
    "carousel.next.aria": "Next",
    "scroll.bottom.aria": "Scroll to bottom",
    "error.network": "Weâ€™re sorry, something went wrong. Please try again.",
    "loading.message": "Please wait while we process your request...",
    "feedback.dialog.title.positive": "Thank you for your feedback!",
    "feedback.dialog.title.negative": "Weâ€™re sorry to hear that.",
    "feedback.dialog.question.positive": "What did you like about your experience?",
    "feedback.dialog.question.negative": "What can we improve?",
    "feedback.dialog.notes": "Additional comments",
    "feedback.dialog.submit": "Submit",
    "feedback.dialog.cancel": "Cancel",
    "feedback.dialog.notes.placeholder": "Type your comments here...",
    "feedback.toast.success": "Thank you for your feedback!",
    "feedback.thumbsUp.aria": "Give positive feedback",
    "feedback.thumbsDown.aria": "Give negative feedback",
    "feedback.title": "We value your feedback",
    "feedback.positive.title": "What did you like?",
    "feedback.negative.title": "What can we improve?",
    "feedback.submitButton": "Submit Feedback",
    "feedback.positive.options": "",
    "feedback.negative.options": ""
  },
  "arrays": {
    "welcome.examples": [
      {
        "text": "Check your VA benefits",
        "systemPrompt": "Help me check my VA benefits.",
        "imageUrl": "",
        "imageName": "",
        "image": "",
        "backgroundColor": "#162e51"
      },
      {
        "text": "Find a VA location",
        "systemPrompt": "Find a VA location near me.",
        "imageUrl": "",
        "imageName": "",
        "image": "",
        "backgroundColor": "#162E51"
      },
      {
        "text": "Learn about VA health care",
        "systemPrompt": "Tell me about VA health care options.",
        "imageUrl": "",
        "imageName": "",
        "image": "",
        "backgroundColor": "#162E51"
      },
      {
        "text": "Manage my VA account",
        "systemPrompt": "How do I manage my VA account?",
        "imageUrl": "",
        "imageName": "",
        "image": "",
        "backgroundColor": "#162E51"
      }
    ],
    "feedback.positive.options": [
      "Easy to use",
      "Helpful information",
      "Quick responses",
      "Clear navigation",
      "Other"
    ],
    "feedback.negative.options": [
      "Difficult to use",
      "Unclear information",
      "Slow responses",
      "Confusing navigation",
      "Other"
    ]
  },
  "assets": {
    "icons": {
      "company": "https://www.va.gov/img/tiny-usa-flag.png"
    }
  },
  "theme": {
    "--welcome-heading-size-desktop": "32px",
    "--welcome-heading-size-mobile": "32px",
    "--welcome-heading-weight": "700",
    "--welcome-heading-text-align": "center",
    "--welcome-subheading-size-desktop": "20px",
    "--welcome-subheading-size-mobile": "20px",
    "--welcome-subheading-text-align": "center",
    "--welcome-padding": "2rem",
    "--prompt-suggestion-background": "#522752",
    "--prompt-suggestion-background-hover": "#522752",
    "--prompt-suggestion-text-color": "#522752",
    "--prompt-suggestion-border-color": "#522752",
    "--welcome-header-order": "3",
    "--welcome-input-order": "1",
    "--welcome-cards-order": "2",
    "--font-family": "Source Sans Pro, Helvetica, Arial, sans-serif",
    "--color-primary": "#005EA8",
    "--color-text": "#522752",
    "--line-height-body": "1.6",
    "--main-container-background": "#ffffff",
    "--input-height": "48px",
    "--input-height-mobile": "40px",
    "--input-border-radius": "4px",
    "--input-border-radius-mobile": "4px",
    "--input-background": "#ffffff",
    "--input-outline-color": "#d9d9d9",
    "--input-outline-width": "1px",
    "--input-box-shadow": "0 1px 4px rgba(0, 0, 0, 0.1)",
    "--input-focus-outline-width": "2px",
    "--input-focus-outline-color": "#162e51",
    "--input-font-size": "1rem",
    "--input-font-weight": "400",
    "--input-text-color": "#162e51",
    "--input-button-height": "36px",
    "--input-button-width": "36px",
    "--submit-button-fill-color": "#ffffff",
    "--submit-button-fill-color-disabled": "#CCCCCC",
    "--color-button-submit": "#162e51",
    "--color-button-submit-hover": "#162e51",
    "--input-button-border-radius": "14.5px",
    "--button-disabled-background": "#F0F0F0",
    "--disclaimer-color": "#6f7a41",
    "--disclaimer-font-size": "14px",
    "--disclaimer-font-weight": "400",
    "--message-user-background": "#162e51",
    "--message-user-text": "#ffffff",
    "--message-border-radius": "11.5px",
    "--message-padding": "1rem",
    "--message-concierge-background": "#f3f3f3",
    "--message-concierge-text": "#000000",
    "--message-max-width": "100%",
    "--chat-interface-max-width": "768px",
    "--message-blocker-height": "48px",
    "--loading-message-background": "#d9d9d9",
    "--loading-dot-background": "#626262",
    "--color-text-muted": "#626262",
    "--citations-text-font-weight": "400",
    "--citations-desktop-button-font-size": "0.875rem",
    "--feedback-icon-btn-background": "#e1f3f8",
    "--feedback-icon-btn-hover-background": "#d0e8f0",
    "--feedback-icon-btn-size-desktop": "40px",
    "--feedback-container-gap": "1rem",
    "--multimodal-card-box-shadow": "0 2px 8px rgba(0, 0, 0, 0.1)",
    "--border-radius-card": "17px",
    "--button-height-s": "36px",
    "--button-primary-background": "#162e51",
    "--button-primary-text": "#ffffff",
    "--button-primary-hover": "#522752",
    "--button-secondary-border": "1px solid #1a4480",
    "--button-secondary-text": "#1a4480",
    "--button-secondary-hover": "#162e51",
    "--color-button-secondary-hover-text": "#ffffff",
    "--privacy-notice-background": "#f1f1f1",
    "--privacy-notice-padding": "1rem",
    "--privacy-notice-title-color": "#626262",
    "--privacy-notice-text-color": "#626262",
    "--privacy-notice-text-font-size": "0.875rem",
    "--privacy-notice-title-font-size": "1rem",
    "--message-concierge-link-decoration": "underline",
    "--color-secondary": "#1a4480",
    "--prompt-suggestion-button-background": "#d9d9d9",
    "--prompt-pill-background": "#eee",
    "--button-primary-mobile-background": "#522752",
    "--button-primary-mobile-hover": "#522752",
    "--main-container-mobile-background": "#ffffff",
    "--message-concierge-border-width": "1px",
    "--message-concierge-link-color": "#1a4480",
    "--prompt-suggestion-button-border-radius": "6.9px",
    "--prompt-suggestion-button-padding": "0.5rem 1rem",
    "--prompt-suggestions-container-gap": "0.5rem",
    "--card-background": "#1a4480",
    "--card-text-font-size": "16px",
    "--card-text-padding": "1rem",
    "--chat-container-background": "#ffffff",
    "--message-blocker-background": "#ffffff",
    "--card-text-color": "#ffffff",
    "--prompt-pill-border-color": "#B8C7D3",
    "--prompt-pill-text-color": "#003F72",
    "--prompt-suggestion-button-text-color": "#626262",
    "--prompt-suggestion-button-background-hover": "#d9d9d9",
    "--welcome-heading-text-color": "#000000",
    "--welcome-subheading-text-color": "#000000",
    "--welcome-header-order": "1",
    "--prompt-suggestions-flex-direction": "row",
    "--prompt-suggestions-flex-wrap": "wrap",
    "--prompt-pill-background-hover": "#E8EEF3",
    "--prompt-pill-icon-color": "#FFFFFF",
    "--card-border-radius": "8px",
    "--card-text-border-radius": "8px",
    "--chat-container-bottom-background": "#ffffff",
    "--main-container-bottom-background": "#ffffff"
  }
};