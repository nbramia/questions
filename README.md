In the context of this development, one of the main purposes of the README is actually to maintain context for AI agents. AI can only hold so much context in its context window, and I want the README to be a resource for them when they lose all memory – to be able to go back and quickly get back up to speed on exactly how everything fits together. Maintain it accordingly!

# Feedback Forms Platform + 20 Questions Experience

A comprehensive serverless platform featuring two distinct but complementary experiences:

1. **Dynamic Feedback Forms**: Create, manage, and collect responses from customizable forms
2. **20 Questions AI Experience**: Interactive AI-guided goal exploration and problem-solving

Both systems are built with Next.js 15, TypeScript, and integrated with Google services for seamless data management.

## 🏗️ Platform Architecture Overview

This application uses a **hybrid serverless architecture** combining multiple services:

- **Next.js 15 (Vercel)**: Admin interface, form creation, AI interactions, and API routes
- **GitHub Pages**: Static form hosting and storage  
- **Google Apps Script + Sheets**: Response collection and storage
- **Google Drive**: 20Q session storage and summaries
- **Google Calendar**: Smart notification scheduling
- **OpenAI API**: AI-powered question generation and analysis
- **Telegram Bot API**: Intelligent user notifications
- **Custom Domain**: Unified experience through `ramia.us`

### 🎯 How the Two Systems Co-Exist

The platform operates as **two parallel but integrated systems**:

#### **Existing Forms Platform**
- **Purpose**: Traditional form creation and response collection
- **URLs**: `/dashboard`, `/create`, `/questions/[id]`
- **Storage**: GitHub Pages + Google Sheets
- **Workflow**: Admin creates → Users fill → Responses collected

#### **20 Questions Experience**
- **Purpose**: AI-guided goal exploration and problem-solving
- **URLs**: `/20q`, `/20q/session/[id]`
- **Storage**: Google Drive + Local Storage
- **Workflow**: AI asks → User answers → Insights generated

#### **Shared Infrastructure**
- **Same Next.js app** - unified deployment and hosting
- **Same UI components** - consistent design system
- **Same authentication** - password-protected admin areas
- **Same domain** - `ramia.us` serves both experiences
- **Same Google services** - leveraging existing integrations

### Key URLs
| Component | URL | Purpose |
|-----------|-----|---------|
| Landing Page | `https://ramia.us/` | Password authentication and navigation |
| Admin Dashboard | `https://ramia.us/dashboard` | Form management interface |
| Create/Edit Forms | `https://ramia.us/create` | Form builder with drag-and-drop |
| Live Forms | `https://ramia.us/questions/<formId>` | Public form access |
| **20 Questions** | `https://ramia.us/20q` | **AI-guided goal exploration** |
| **20Q Sessions** | `https://ramia.us/20q/session/<id>` | **Completed session review** |
| Static Files | `https://nbramia.github.io/questions/question/<formId>/` | Raw form files |

## 🔧 Core Data Structures & Interfaces

### Forms Platform Interfaces
```typescript
interface Question {
  id: string;
  type: string; // "text" | "yesno" | "multiple" | "checkbox" | "scale" | "likert"
  label: string;
  options: string[];
  scaleRange?: number;
  skipLogic?: {
    enabled: boolean;
    dependsOn: string;
    condition: string; // "equals" | "contains" | "greater_than" | etc.
    value: string;
  };
}

interface FormData {
  formId?: string;
  title: string;
  description?: string;
  questions: Question[];
  enforceUnique?: boolean;
  expires_at?: string;
}
```

### 20Q Platform Interfaces
```typescript
interface QuestionTurn {
  question: string;
  answer: string;
  rationale?: string;
  confidenceAfter?: number;
  type: 'text' | 'likert' | 'choice';
}

interface SessionState {
  id: string;
  createdAt: string;
  goal: string;
  goalConfirmed: boolean;
  turns: QuestionTurn[];
  finalSummary?: string;
  status: 'in-progress' | 'completed';
  userStopped?: boolean;
}
```

### Key Implementation Patterns

#### **Forms Platform**
- **Static Generation**: Forms deployed as static HTML to GitHub Pages
- **JSONP Submission**: Cross-origin form submissions via Google Apps Script
- **GitHub API**: Dynamic form creation and management
- **Google Sheets**: One sheet per form for response storage

#### **20Q Platform**
- **Real-time AI**: OpenAI GPT-4 for dynamic question generation
- **Session Persistence**: Google Drive for session storage
- **Local Caching**: Browser localStorage for offline capability
- **Smart Notifications**: Calendar-aware Telegram notifications

## 📋 Features

### Form Management (Existing)
- **Multiple Question Types**: Text areas, Yes/No, Multiple Choice, Checkboxes, Scale sliders (1-N), Likert scales
- **Conditional Logic (Skip Logic)**: Show/hide questions based on previous answers with various conditions (equals, contains, includes, greater than, etc.)
- **Form Expiration**: Time-based expiration (minutes, hours, days) or manual disable/enable
- **Unique Submissions**: IP-based duplicate prevention
- **Drag & Drop Interface**: Reorder questions with @dnd-kit
- **Real-time Preview**: Live form preview as you build

### Admin Dashboard (Existing)
- **Form Listing**: View all forms with search, filtering, and sorting
- **Response Analytics**: View response counts and last response times
- **Quick Actions**: Edit, Duplicate, Enable/Disable, Delete, Copy links, Generate QR codes
- **Status Management**: Active/Disabled status with expiration tracking
- **Real-time Updates**: 60-second countdown for status changes with automatic refresh

### Response Collection (Existing)
- **Google Sheets Integration**: Automatic response storage with dynamic sheet creation
- **JSONP Support**: Cross-origin form submissions without CORS issues
- **Response Statistics**: Total count and last response timestamp tracking
- **IP Tracking**: User agent and IP logging for uniqueness enforcement

## 🤖 20 Questions AI Experience

### Core Features
- **AI-Powered Question Generation**: Dynamic questions based on user responses and goals
- **Sequential Goal Exploration**: Progressive understanding through intelligent questioning
- **Multiple Input Types**: Text responses, Likert scales (1-5), and choice selections
- **Real-time Session Management**: Auto-save and resume functionality
- **Intelligent Summaries**: AI-generated insights and recommendations
- **Smart Notifications**: Calendar-aware nudging via Telegram

### Question Types
| Type | Input | Use Case |
|------|-------|----------|
| **Text** | Textarea | Detailed responses, open-ended exploration |
| **Likert** | 1-5 Scale | Agreement levels, preference ratings |
| **Choice** | Yes/No/Maybe | Quick decisions, binary choices |

### Session Flow
1. **Goal Definition**: AI asks initial questions to understand user's objective
2. **Progressive Exploration**: Each answer informs the next question
3. **Confidence Tracking**: AI monitors understanding level (0-100%)
4. **Session Completion**: Automatic summary generation when goal is clear
5. **Smart Follow-up**: Calendar-aware notifications for continued progress

### AI Capabilities
- **Contextual Understanding**: Remembers all previous answers
- **Adaptive Questioning**: Adjusts question type and depth based on responses
- **Confidence Scoring**: Tracks how well the AI understands the user's goal
- **Insight Generation**: Creates actionable summaries and recommendations
- **Calendar Integration**: Analyzes schedule to suggest optimal notification times

### Session Management
- **Persistent Storage**: Google Drive integration for session backup
- **Local Caching**: Browser storage for offline capability
- **Session Recovery**: Resume interrupted sessions
- **Export Options**: JSON and text summary formats
- **Privacy Focused**: No personal data collection beyond session content

### Smart Notifications
- **Calendar Analysis**: Reviews upcoming events to find optimal timing
- **AI Decision Making**: Determines if and when to send nudges
- **Telegram Integration**: Direct messaging with session links
- **Contextual Messages**: Personalized reminders based on goal progress

## 🛠️ Tech Stack

### Frontend
- **Next.js 15**: App Router with TypeScript
- **React 19**: Modern React with hooks and concurrent features
- **Tailwind CSS 4**: Utility-first styling with dark mode support
- **Radix UI**: Accessible component primitives
- **@dnd-kit**: Drag and drop functionality (forms)
- **qrcode-svg**: QR code generation (forms)

### Backend & Storage
- **Vercel**: Serverless hosting and API routes
- **GitHub API**: Form file storage and version control
- **Google Apps Script**: Response processing and storage (forms)
- **Google Sheets**: Response data warehouse (forms)
- **Google Drive**: 20Q session storage and summaries
- **Google Calendar**: Smart notification scheduling
- **OpenAI API**: GPT-4 for question generation and analysis
- **Telegram Bot API**: Intelligent user notifications

### Development
- **TypeScript**: Full type safety
- **ESLint**: Code linting and formatting
- **PostCSS**: CSS processing

## 📁 Project Structure

```
├── src/app/
│   ├── page.tsx                    # Root landing page with auth
│   ├── dashboard/page.tsx          # Admin dashboard (client component)
│   ├── create/page.tsx             # Form builder (client component)
│   ├── questions/[id]/page.tsx     # Dynamic form viewer
│   ├── 20q/                       # 20 Questions AI Experience
│   │   ├── page.tsx               # Main 20Q interface
│   │   └── session/[id]/page.tsx  # Session review
│   ├── api/
│   │   ├── create-page/route.ts    # Form creation & GitHub deployment
│   │   ├── forms/                  # Form management APIs
│   │   └── 20q/                   # 20Q AI APIs
│   │       ├── generate-question/  # AI question generation
│   │       ├── save-session/       # Session storage
│   │       ├── notify/             # Telegram notifications
│   │       ├── schedule-nudge/     # Smart notification scheduling
│   │       └── session/[id]/       # Session retrieval
│   └── components/
│       ├── ui/                     # Reusable UI components
│       └── 20q/                   # 20Q-specific components
│           ├── QuestionCard.tsx    # Individual question interface
│           ├── WhyThisQuestion.tsx # AI rationale display
│           └── SessionSummary.tsx  # Session completion view
├── src/lib/
│   ├── 20q/                       # 20Q AI utilities
│   │   ├── agent.ts               # AI interaction logic
│   │   ├── prompts.ts             # LLM prompt templates
│   │   ├── summarizer.ts          # Session summary generation
│   │   ├── calendar.ts            # Google Calendar integration
│   │   └── telegram.ts            # Telegram notification utilities
│   └── storage/
│       ├── drive.ts               # Google Drive operations
│       └── memory.ts              # Local session caching
├── public/template/index.html      # Base form template
├── google-apps-script-jsonp.js     # Apps Script source code
└── docs/question/                  # Generated form files (GitHub Pages)
```

## 🔄 Critical Data Flows

### Forms Platform Flow
```
1. Form Creation:
   Admin → /create → POST /api/create-page → GitHub API → 
   docs/question/<id>/config.json + index.html → GitHub Pages (60s delay)

2. Form Submission:
   User → /questions/<id> → Static HTML → JSONP → Google Apps Script → 
   Google Sheets → Response count update → Dashboard analytics

3. Form Management:
   Dashboard → API Routes → GitHub API → Config updates → Status changes
```

### 20Q Platform Flow
```
1. Session Initiation:
   User → /20q → React component → POST /api/20q/generate-question → 
   OpenAI API → Question + rationale → UI update

2. Session Progression:
   User answer → POST /api/20q/generate-question → OpenAI API → 
   Next question → Auto-save to Google Drive

3. Session Completion:
   AI confidence > 80% → Generate summary → Save to Drive → 
   Show SessionSummary component

4. Smart Notifications:
   Calendar events → POST /api/20q/schedule-nudge → OpenAI analysis → 
   Telegram notification → User engagement
```

## ⚙️ Setup Instructions

### Prerequisites
- Node.js 18+
- GitHub account with repository access
- Google account for Sheets/Drive/Calendar integration
- Vercel account for deployment
- OpenAI API key for AI features
- Telegram Bot token for notifications
- Custom domain (optional)

### Environment Variables
Create `.env.local` with:

#### **Existing Forms Platform**
```env
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbw.../exec
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
```

#### **20 Questions AI Experience (Multi-Account)**
```env
# OpenAI API
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Personal Google Account
GOOGLE_SERVICE_ACCOUNT_EMAIL_PERSONAL=20q-service-account@personal-20q-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_PERSONAL="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID_PERSONAL=your_personal_folder_id
GOOGLE_CALENDAR_ID_PERSONAL=your_personal_email@gmail.com

# Work Google Account
GOOGLE_SERVICE_ACCOUNT_EMAIL_WORK=20q-service-account@work-20q-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_WORK="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID_WORK=your_work_folder_id
GOOGLE_CALENDAR_ID_WORK=your_work_email@company.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

### **Multi-Account Setup (Personal + Work)**

The 20Q system now supports **automatic account selection** based on session context. The AI will automatically choose between your personal and work accounts based on the content of your conversations.

#### **Environment Variables for Multi-Account**

Create `.env.local` with both account configurations:

```env
# OpenAI API
OPENAI_API_KEY=sk-your-openai-api-key

# Personal Google Account
GOOGLE_SERVICE_ACCOUNT_EMAIL_PERSONAL=20q-service-account@personal-20q-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_PERSONAL="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID_PERSONAL=your_personal_drive_folder_id
GOOGLE_CALENDAR_ID_PERSONAL=your_personal_email@gmail.com

# Work Google Account  
GOOGLE_SERVICE_ACCOUNT_EMAIL_WORK=20q-service-account@work-20q-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY_WORK="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_FOLDER_ID_WORK=your_work_drive_folder_id
GOOGLE_CALENDAR_ID_WORK=your_work_email@company.com

# Telegram Bot
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

#### **How Multi-Account Selection Works**

The AI automatically determines which account to use based on session content:

**Work Context Keywords:**
- work, job, career, office, meeting, project, team, colleague
- boss, manager, client, business, company, professional
- deadline, presentation, report, strategy, management

**Personal Context Keywords:**
- personal, family, home, life, relationship, health, fitness
- hobby, travel, vacation, friend, partner, child, parent
- wellness, lifestyle, self-improvement, happiness

**Examples:**
- "I need to improve my presentation skills" → **Work account**
- "I want to plan a family vacation" → **Personal account**
- "I'm struggling with work-life balance" → **Personal account** (default for ambiguous cases)

#### **Multi-Account Features**

1. **Automatic Context Detection**: AI analyzes your goal and answers to choose the right account
2. **Separate Storage**: Sessions are saved to the appropriate Google Drive folder
3. **Context-Aware Notifications**: Calendar analysis uses the relevant calendar
4. **Clear Labeling**: Notifications are prefixed with [Personal] or [Work]
5. **Session Recovery**: System searches both accounts when retrieving sessions
6. **Overlaid Calendar Analysis**: For scheduling nudges, AI sees BOTH personal and work calendars overlaid to find optimal timing across your full schedule

### **Google Services Setup**

1. **Create Google Cloud Project**
2. **Enable APIs:**
   - Google Drive API
   - Google Calendar API
3. **Create Service Account:**
   - Download JSON credentials
   - Extract email and private key
4. **Set up Google Drive:**
   - Create a folder for 20Q sessions
   - Share folder with service account email
   - Get folder ID from URL
5. **Set up Google Calendar:**
   - Share calendar with service account email
   - Use calendar ID or 'primary'

### OpenAI Setup
1. Create OpenAI account and get API key
2. Add key to environment variables
3. Ensure sufficient credits for AI operations

### Telegram Bot Setup
1. **Create Bot via @BotFather**
2. **Get bot token**
3. **Get chat ID:**
   - Send message to bot
   - Visit: `https://api.telegram.org/bot<TOKEN>/getUpdates`
   - Extract chat_id from response

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Add all environment variables in Vercel dashboard
3. Deploy automatically on push to main branch
4. Configure custom domain (optional)

## 🚀 Development

### Local Development
```bash
npm install
npm run dev
```
Access at `http://localhost:3000`

### Building for Production
```bash
npm run build
npm start
```

## 📊 Data Flow

### Form Creation (Existing)
```
Admin Dashboard → Create Form → POST /api/create-page → GitHub API → 
GitHub Pages Deploy (60s) → Form URL Available
```

### Form Submission (Existing)
```
User Fills Form → JSONP to Google Apps Script → Google Sheets → 
Response Statistics → Dashboard Analytics
```

### 20Q Session Flow
```
User Starts 20Q → AI Generates Question → User Answers → 
Session Saved → Next Question → Final Summary → Google Drive
```

### Smart Notifications (20Q)
```
Calendar Analysis → AI Decision → Telegram Notification → 
User Engagement → Session Continuation
```

## 🔌 API Routes

### Core APIs (Existing Forms)
- `GET /api/forms` - List all forms with metadata
- `POST /api/create-page` - Create new form and deploy to GitHub
- `GET /api/forms/[id]` - Serve form with injected config
- `DELETE /api/forms/[id]` - Delete form from GitHub
- `POST /api/forms/[id]/toggle` - Enable/disable form
- `POST /api/forms/[id]/update` - Update existing form
- `GET /api/forms/[id]/responses` - Get response statistics

### 20Q AI APIs
- `POST /api/20q/generate-question` - AI-powered question generation
- `POST /api/20q/save-session` - Session storage to Google Drive
- `GET /api/20q/session/[id]` - Retrieve completed sessions
- `POST /api/20q/notify` - Send Telegram notifications
- `POST /api/20q/schedule-nudge` - Calendar-aware notification scheduling

### Authentication
Password-based authentication with localStorage persistence for admin functions.

## 📋 Form Features (Existing)

### Question Types
| Type | Input | Notes |
|------|-------|-------|
| Text | Textarea | Multiline text input |
| Yes/No | Radio buttons | Simple binary choice |
| Multiple Choice | Radio list | Single selection |
| Checkbox | Checkbox list | Multiple selections |
| Scale | Slider | Numeric rating (1-N) |
| Likert | Radio list | Predefined scale options |

### Skip Logic Conditions
- **equals** / **not_equals**: Exact value matching
- **contains** / **not_contains**: Text substring matching
- **includes** / **not_includes**: Array value matching (checkboxes)
- **greater_than** / **less_than**: Numeric comparisons

### Form Options
- **Expiration**: Time-based or manual disable
- **Unique Submissions**: IP-based duplicate prevention
- **Dark Mode**: Per-form dark mode toggle
- **Description**: Optional form description text

## 🤖 20Q AI Features

### Question Generation
- **Contextual Awareness**: Each question builds on previous answers
- **Adaptive Types**: AI chooses optimal input type (text/likert/choice)
- **Confidence Tracking**: Monitors understanding level (0-100%)
- **Rationale Display**: Shows why each question is being asked

### Session Management
- **Auto-save**: Every 30 seconds to prevent data loss
- **Resume Capability**: Continue interrupted sessions
- **Export Options**: JSON and human-readable summaries
- **Privacy Focused**: No personal data beyond session content

### Smart Notifications
- **Calendar Integration**: Analyzes upcoming events
- **AI Decision Making**: Determines optimal notification timing
- **Contextual Messages**: Personalized based on goal progress
- **Direct Links**: One-click access to continue sessions

## 🏗️ Deployment Architecture

### Production Flow
1. **Code Changes**: Push to main branch
2. **Vercel Build**: Automatic Next.js deployment
3. **Form Changes**: API routes update GitHub repository
4. **GitHub Pages**: Automatic static file deployment (~60 seconds)
5. **20Q Sessions**: Real-time Google Drive storage
6. **AI Operations**: OpenAI API calls for question generation

### File Storage
- **Form Configs**: `docs/question/<formId>/config.json`
- **Form Templates**: `docs/question/<formId>/index.html`
- **Response Data**: Google Sheets (one sheet per form)
- **20Q Sessions**: Google Drive (JSON + text summaries)

## 🔧 Troubleshooting

### Common Issues (Existing Forms)
| Problem | Solution |
|---------|----------|
| Form 404 after creation | Wait 1-2 minutes for GitHub Pages deployment |
| Forms showing 0 responses | Check Google Apps Script logs and sheet naming |
| Enable/Disable stuck | Check Vercel function logs for API errors |
| Form not loading | Verify GitHub Pages is enabled and files exist |
| CORS errors | Ensure Google Apps Script is deployed as web app |

### Common Issues (20Q)
| Problem | Solution |
|---------|----------|
| AI not generating questions | Check OpenAI API key and credits |
| Sessions not saving | Verify Google Drive folder permissions |
| Notifications not sending | Check Telegram bot token and chat ID |
| Calendar integration failing | Ensure Google Calendar API is enabled |
| Session loading errors | Check Google Drive file permissions |

### Debug Locations
- **Browser Console**: Form loading and submission errors
- **Vercel Functions**: API route errors and external API issues
- **Google Apps Script**: Execution logs and runtime errors (forms)
- **Google Drive**: Session file access and permissions (20Q)
- **OpenAI API**: Question generation and analysis logs
- **Telegram Bot**: Notification delivery status

## 🔑 Key Implementation Details

### Forms Platform Critical Files
- `src/app/create/page.tsx` - Form builder with drag-and-drop
- `src/app/dashboard/page.tsx` - Admin dashboard
- `src/app/questions/[id]/page.tsx` - Dynamic form viewer
- `src/app/api/create-page/route.ts` - Form creation and GitHub deployment
- `src/app/api/forms/route.ts` - Form listing and management
- `public/template/index.html` - Base form template
- `google-apps-script-jsonp.js` - Response processing script

### 20Q Platform Critical Files
- `src/app/20q/page.tsx` - Main 20Q interface
- `src/app/20q/session/[id]/page.tsx` - Session review
- `src/components/20q/QuestionCard.tsx` - Question interface
- `src/lib/20q/agent.ts` - AI interaction logic
- `src/lib/20q/prompts.ts` - LLM prompt templates
- `src/lib/storage/drive.ts` - Google Drive operations
- `src/app/api/20q/generate-question/route.ts` - AI question generation

### Shared Infrastructure
- `src/components/ui/` - Reusable UI components
- `src/app/layout.tsx` - Root layout with dark mode
- `src/app/page.tsx` - Landing page with authentication
- `src/lib/dark-mode.tsx` - Dark mode provider

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with appropriate tests
4. Submit a pull request with detailed description

## 📄 License

MIT License - see LICENSE file for details.
