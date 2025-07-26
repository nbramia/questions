# Feedback Form Creator

A Next.js application that allows you to create and deploy custom feedback forms with various question types, conditional logic, and Google Sheets integration. The application is deployed on Vercel with a custom domain and uses GitHub Pages for form storage.

## Architecture Overview

The application uses a **hybrid architecture**:

- **Vercel**: Hosts the Next.js application (admin panel, API routes, dynamic routes)
- **GitHub Pages**: Stores and serves the actual form files (HTML + config)
- **Custom Domain**: Routes everything through `ramia.us` for a seamless experience

### Data Flow

1. **Form Creation**: Admin panel → Vercel API → GitHub Pages deployment
2. **Form Viewing**: User visits URL → Vercel dynamic route → GitHub Pages fetch → Form display
3. **Form Submission**: User submits → Google Apps Script → Google Sheets

## Features

- **Multiple Question Types**: Text responses, Yes/No, Multiple Choice, Checkboxes, Scale ratings, and Likert scales
- **Conditional Logic**: Show/hide questions based on previous answers
- **Form Expiration**: Set forms to expire after a specified time
- **Unique Submissions**: Prevent duplicate submissions by IP address
- **Google Sheets Integration**: Automatically saves responses to Google Sheets
- **Drag & Drop Interface**: Reorder questions easily
- **Real-time Preview**: See form changes as you build them
- **Responsive Design**: Works on desktop and mobile devices
- **Custom Domain**: Professional URLs like `ramia.us/questions/[form-id]`

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Drag & Drop**: @dnd-kit
- **UI Components**: Radix UI primitives
- **Deployment**: Vercel with custom domain
- **Form Storage**: GitHub Pages
- **Data Storage**: Google Sheets via Google Apps Script

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, or pnpm
- GitHub account with a repository
- Google account for Google Sheets integration
- Vercel account for deployment
- Custom domain (optional but recommended)

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

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Custom Domain Setup

1. In Vercel dashboard, go to your project settings
2. Navigate to "Domains" section
3. Add your custom domain (e.g., `ramia.us`)
4. Vercel will provide DNS records to configure
5. Update your domain registrar with the provided DNS records

## Usage

### Creating Forms

1. Navigate to `https://your-domain.com/admin` and enter your admin password
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

### Form Deployment Process

When you create a form, the application:

1. **Generates a unique 6-character ID** (e.g., `jK3erp`)
2. **Creates a JSON configuration file** with form settings and questions
3. **Deploys the form HTML template** with embedded configuration
4. **Commits both files to GitHub** via GitHub API
5. **GitHub Pages automatically deploys** the files (takes 1-2 minutes)
6. **Returns a shareable URL** like `https://ramia.us/questions/jK3erp/`

### Form Access

Forms are accessible at: `https://your-domain.com/questions/{form-id}/`

The dynamic route fetches the form data from GitHub Pages and renders it seamlessly.

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
│   │   ├── forms/       # Form data serving API
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

docs/
└── question/            # Form files deployed to GitHub Pages
    └── [form-id]/
        ├── config.json  # Form configuration
        └── index.html   # Form template

google-apps-script-jsonp.js  # Google Apps Script for data collection
```

## API Endpoints

### POST /api/create-page
Creates and deploys a new form to GitHub Pages.

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
  "link": "https://ramia.us/questions/abc123/"
}
```

### GET /api/forms/[id]
Serves form data by fetching from GitHub Pages.

**Response:**
```json
{
  "config": { /* form configuration */ },
  "template": "<html>...</html>"
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

## Deployment Architecture

### Vercel (Production)
- **Domain**: `ramia.us` (custom domain)
- **Admin Panel**: `https://ramia.us/admin`
- **Form URLs**: `https://ramia.us/questions/[form-id]/`
- **API Routes**: Serverless functions for form creation and serving

### GitHub Pages (Form Storage)
- **Domain**: `https://nbramia.github.io/questions/`
- **Form Files**: `https://nbramia.github.io/questions/question/[form-id]/`
- **Automatic Deployment**: Triggered by GitHub API commits

### Data Flow
1. **Form Creation**: Vercel API → GitHub API → GitHub Pages
2. **Form Viewing**: Vercel Dynamic Route → GitHub Pages fetch → Render
3. **Form Submission**: Client → Google Apps Script → Google Sheets

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
5. **404 Errors on Forms**: Wait 1-2 minutes for GitHub Pages deployment
6. **Custom Domain Issues**: Verify DNS records are configured correctly

### Debug Mode

Enable console logging by adding `console.log` statements in the template JavaScript or checking browser developer tools.

### Deployment Timing

- **Vercel**: Instant deployment
- **GitHub Pages**: 1-2 minute delay after commit
- **Form Availability**: Forms may take 1-2 minutes to become accessible

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
