# Feedback Form Creator

A Next.js application that allows you to create and deploy custom feedback forms with various question types, conditional logic, and Google Sheets integration.

## Features

- **Multiple Question Types**: Text responses, Yes/No, Multiple Choice, Checkboxes, Scale ratings, and Likert scales
- **Conditional Logic**: Show/hide questions based on previous answers
- **Form Expiration**: Set forms to expire after a specified time
- **Unique Submissions**: Prevent duplicate submissions by IP address
- **Google Sheets Integration**: Automatically saves responses to Google Sheets
- **Drag & Drop Interface**: Reorder questions easily
- **Real-time Preview**: See form changes as you build them
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: @dnd-kit
- **UI Components**: Radix UI primitives
- **Deployment**: GitHub Pages integration via GitHub API
- **Data Storage**: Google Sheets via Google Apps Script

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- GitHub account with a repository
- Google account for Google Sheets integration

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd questions
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Add the following environment variables to `.env.local`:
```env
GITHUB_TOKEN=your_github_personal_access_token
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYED_SCRIPT_ID/exec
NEXT_PUBLIC_ADMIN_PASSWORD=your_admin_password
```

### GitHub Setup

1. Create a GitHub Personal Access Token with `repo` permissions
2. Create a repository for storing form files (e.g., `nbramia/questions`)
3. Enable GitHub Pages in your repository settings
4. Update the repository name in `src/app/api/create-page/route.ts`:
```typescript
const GITHUB_REPO = "your-username/your-repo-name";
```

### Google Sheets Setup

1. Create a new Google Sheet
2. Deploy the Google Apps Script from `google-apps-script-jsonp.js`:
   - Go to [Google Apps Script](https://script.google.com/)
   - Create a new project
   - Replace the default code with the contents of `google-apps-script-jsonp.js`
   - Update the `spreadsheetId` in the script with your actual spreadsheet ID
   - Deploy as a web app (set access to "Anyone")
   - Copy the deployment URL and update `GOOGLE_SCRIPT_URL` in your environment variables

### Running the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Usage

### Creating Forms

1. Navigate to `/admin` and enter your admin password
2. Fill in the form details:
   - **Title**: The form title that will be displayed
   - **Description**: Optional description or instructions
   - **Expiration**: Set when the form should expire (optional)
   - **Enforce Unique**: Prevent multiple submissions from the same IP

3. Add questions by clicking "Add Question":
   - **Text Response**: Free-form text input
   - **Yes/No**: Simple yes/no radio buttons
   - **Multiple Choice**: Single selection from options
   - **Checkboxes**: Multiple selections allowed
   - **Scale**: Numeric rating (1-5, 1-10, or 1-100)
   - **Likert**: Pre-defined scale options

4. Configure conditional logic (skip logic):
   - Enable "Show only if..." for questions after the first
   - Select which question to depend on
   - Choose the condition (equals, contains, greater than, etc.)
   - Set the value to compare against

5. Click "Create Form" to deploy

### Form Deployment

When you create a form, the application:
1. Generates a unique 6-character ID
2. Creates a JSON configuration file
3. Deploys the form HTML template
4. Commits both files to your GitHub repository
5. Returns a shareable URL

Forms are accessible at: `https://your-domain.com/questions/{form-id}/`

### Response Collection

When users submit forms:
1. Responses are sent to your Google Apps Script
2. Data is automatically saved to Google Sheets
3. Each form gets its own sheet tab
4. Responses include timestamp, IP address, and user agent
5. Duplicate submissions are prevented if enabled

## Project Structure

```
src/
├── app/
│   ├── admin/           # Form creation interface
│   ├── api/
│   │   ├── create-page/ # GitHub deployment API
│   │   └── proxy/       # CORS proxy for Google Apps Script
│   ├── questions/       # Dynamic form pages
│   └── globals.css      # Global styles
├── components/
│   └── ui/              # Reusable UI components
└── lib/
    └── utils.ts         # Utility functions

public/
└── template/
    └── index.html       # Form template

google-apps-script-jsonp.js  # Google Apps Script for data collection
```

## API Endpoints

### POST /api/create-page
Creates and deploys a new form.

**Request Body:**
```json
{
  "title": "Form Title",
  "description": "Optional description",
  "expiration": "24h",
  "enforceUnique": true,
  "questions": [
    {
      "id": "q1",
      "type": "text",
      "label": "What's your feedback?",
      "options": []
    }
  ]
}
```

**Response:**
```json
{
  "link": "https://your-domain.com/questions/abc123/"
}
```

### POST /api/proxy
Proxies requests to Google Apps Script to avoid CORS issues.

## Configuration

### Environment Variables

- `GITHUB_TOKEN`: GitHub Personal Access Token
- `GOOGLE_SCRIPT_URL`: Deployed Google Apps Script URL
- `NEXT_PUBLIC_ADMIN_PASSWORD`: Password for admin access

### GitHub Repository Settings

Update these constants in `src/app/api/create-page/route.ts`:
- `GITHUB_REPO`: Your repository name
- `GITHUB_BRANCH`: Branch to deploy to (usually "main")
- `TARGET_PATH`: Directory path for form files

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Customization

### Styling

The form template uses Tailwind CSS. Modify `public/template/index.html` to change the form appearance.

### Question Types

Add new question types by:
1. Updating the admin interface in `src/app/admin/page.tsx`
2. Adding rendering logic in the template JavaScript
3. Updating the Google Apps Script to handle new data formats

### Data Storage

The Google Apps Script can be modified to:
- Send email notifications
- Integrate with other Google services
- Export data to different formats
- Add data validation rules

## Troubleshooting

### Common Issues

1. **GitHub API Errors**: Check your GitHub token permissions
2. **Google Sheets Not Updating**: Verify the spreadsheet ID in the Apps Script
3. **CORS Errors**: Ensure the Google Apps Script is deployed as a web app
4. **Forms Not Loading**: Check that GitHub Pages is enabled for your repository

### Debug Mode

Enable console logging by adding `console.log` statements in the template JavaScript or checking browser developer tools.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the Google Apps Script documentation
3. Open an issue on GitHub
4. Check the Next.js documentation for framework-specific questions
