# TempMail - Temporary Email Service

## Project Overview

TempMail is a client-side web application that provides temporary email addresses to protect user privacy online. The service generates disposable email addresses that can be used for website signups, newsletter subscriptions, and account verifications without exposing personal email addresses.

## Features

### Core Functionality
- Instant temporary email address generation
- Real-time inbox display
- Manual inbox refresh
- Email content viewing with HTML support
- Copy email address to clipboard

### Privacy & Security
- No registration required
- Recovery token system for email persistence
- Client-side only architecture - no backend servers
- Content Security Policy implementation
- HTML sanitization to prevent XSS attacks
- Rate limiting protection
- Secure local storage with obfuscation
- Secure wipe option to clear all traces

### User Experience
- Clean, responsive interface
- Dark mode support with system preference detection
- Manual theme toggle
- Mobile-friendly design
- Notification system for user actions
- Privacy notice display

## Technology Stack

### Frontend
- HTML5
- CSS3 with Tailwind CSS
- Vanilla JavaScript (ES6+)
- Font Awesome icons

### Security
- Content Security Policy headers
- XSS prevention through sanitization
- Rate limiting implementation
- Local storage encryption (basic obfuscation)

### APIs
- mail.tm API for email services
  - Domain discovery
  - Account creation
  - Message retrieval
  - Authentication handling

## Installation

### Local Development
1. Clone the repository
2. Open index.html in a web browser
3. No build process or dependencies required

### Deployment
The application can be deployed on any static hosting service:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

## Usage Guide

### Generating an Email Address
1. Open the application
2. A temporary email address is automatically generated
3. Click "Copy" to copy the address to clipboard
4. Use this address for website registrations

### Checking Inbox
- Click "Refresh" to check for new emails
- Emails appear in the inbox list with sender, subject, and timestamp
- Click any email to view full content

### Saving Email Access
1. Click "Get Token" to view your recovery token
2. Save this token securely
3. Use "Recover" with the saved token to access the same inbox from another session

### Security Features
- Click "Secure Wipe" to clear all local data and generate a new email
- Dark mode toggle for comfortable viewing
- Privacy notice explains data handling

## Security Considerations

### Implemented Protections
- Content Security Policy restricts script sources
- HTML sanitization removes malicious content from emails
- Rate limiting prevents API abuse
- Local storage obfuscation adds basic protection
- No inline JavaScript event handlers

### Limitations
- Emails are stored on mail.tm servers
- Recovery tokens are stored in browser local storage
- Service relies on third-party API availability
- Not recommended for highly sensitive information

## API Reference

The application uses the mail.tm API endpoints:

- GET /domains - Retrieve available email domains
- POST /accounts - Create new email account
- POST /token - Authenticate and receive access token
- GET /messages - Retrieve inbox messages
- GET /messages/{id} - Retrieve specific message

## Development

### Project Structure
```
tempmail/
├── index.html          # Main application interface
├── script.js           # Application logic
└── README.md           # Project documentation
```

### Key Functions

#### Core Functions
- generateNewEmail() - Creates new temporary email address
- refreshInbox() - Fetches and displays current messages
- viewMessage() - Displays full email content
- copyEmail() - Copies current email to clipboard

#### Security Functions
- sanitizeHTML() - Removes malicious content from emails
- obfuscate() / deobfuscate() - Basic data protection
- rateLimiter.check() - Prevents API abuse
- secureWipe() - Clears all local data

#### Recovery Functions
- generateRecoveryToken() - Creates unique session token
- saveAccountToStorage() - Stores encrypted account data
- recoverEmail() - Restores previous session
- showTokenTooltip() - Displays recovery token

#### UI Functions
- toggleDarkMode() - Switches between light and dark themes
- showNotification() - Displays user messages
- showPrivacyNotice() - Shows privacy information

## Testing

### Browser Compatibility
Tested and working on:
- Google Chrome (latest)
- Mozilla Firefox (latest)
- Safari (latest)
- Microsoft Edge (latest)

### Test Cases
1. Email generation and copying
2. Inbox refresh and message viewing
3. Dark mode toggle and persistence
4. Recovery token creation and usage
5. Secure wipe functionality
6. Responsive design on mobile devices

## Limitations

### Technical Limitations
- Maximum email size: 10MB
- Attachment support: Not implemented
- Email lifetime: Until browser tab is closed
- Concurrent addresses: Single address per session

### Service Limitations
- Relies on mail.tm API availability
- Rate limits apply (30 requests per minute)
- Email delivery times vary by sender
- Some websites may block temporary email domains

## Future Development

### Planned Features
- Attachment viewing and download
- Multiple email address management
- Custom email expiry times
- Email forwarding options
- PWA support for offline access
- Browser extension version
- End-to-end encryption
- Mobile applications

### Potential Improvements
- Additional email service providers
- Enhanced spam filtering
- Email search functionality
- Folder organization
- API access for developers
- Team collaboration features

## Contributing

### Guidelines
1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Submit pull request for review

### Coding Standards
- Use meaningful variable names
- Comment complex logic
- Maintain existing code style
- Test across browsers
- Ensure security compliance

## License

This project is open source and available for personal and commercial use. No warranty is provided for any purpose.

## Contact

For questions, suggestions, or issues:
- GitHub Issues: [Repository URL]
- Email: [Your Email]

## Acknowledgments

- mail.tm for providing the email API
- Tailwind CSS for the utility-first CSS framework
- Font Awesome for the icon set
- Open source community for security best practices

---

**Disclaimer:** This service is provided as-is for privacy protection. Users are responsible for compliance with applicable laws and terms of service of websites where temporary emails are used.