# **App Name**: Agent Central

## Core Features:

- User Authentication: User authentication via Firebase, managing login, sign-up, and sign-out functionality.
- Dashboard Overview: A dashboard to display key metrics and provide an overview of the call agent service.
- API Keys Management: A form for users to input and securely store API keys for Twilio and ElevenLabs.
- Agent Configuration: Interface to manage and configure AI call agents with options for name, Twilio number, and ElevenLabs voice ID.
- Configuration Suggestion: The application analyzes agent configurations and identifies potential inconsistencies, such as overlapping Twilio numbers or conflicting voice profiles. It then recommends tool that provides improved configurations, including diverse call strategies and optimized voice settings, all presented within the Agents interface.
- Call Logs (Placeholder): Placeholder page for call history and logs.
- Theme Toggle: Enable switching between light and dark themes to accommodate user preferences and improve accessibility.

## Style Guidelines:

- Background: HSL(210, 40%, 98%) or #F4FAFF for light mode and HSL(222, 47%, 11%) or #1C2430 for dark mode.
- Foreground: HSL(215, 28%, 17%) or #2C3747 for light mode and HSL(210, 40%, 98%) or #F4FAFF for dark mode.
- Primary: HSL(217, 91%, 60%) or #4db4ff for light mode and HSL(210, 100%, 71%) or #59BFFF for dark mode.
- Font: 'Inter' (sans-serif) for all text elements, providing a modern and readable interface. Note: currently only Google Fonts are supported.
- Use card-based components with padding (p-6) and rounded corners (rounded-lg) for grouping related information, maintaining consistency.
- Implement a fixed sidebar on the left and a scrollable main content area on the right to improve navigation and content display.
- Subtle transitions on theme switch