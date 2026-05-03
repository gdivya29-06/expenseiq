# ExpenseIQ 💰

A full-stack expense tracking and financial analysis platform that helps individuals and small organizations record, manage, and analyze their financial transactions.

> 🚧 **This project is currently under active development.**

---

## ✨ Features

- 📝 **Expense Logging** — Record daily expenses with categories and descriptions
- 🗂️ **Category Management** — Organize transactions into meaningful groups
- 💼 **Budget Control** — Set monthly or custom budget limits
- 🔔 **Automated Alerts** — Get notified when spending exceeds your limits
- 🤖 **AI Recommendations** — Personalized suggestions based on your spending patterns
- 🏢 **Account Types** — Supports both Individual and Business accounts
- 🧾 **GST Tracking** — Tax-aware expense recording

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | MySQL |
| Auth | bcrypt |

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js (v18+)
- MySQL

### 1. Clone the repository
```bash
git clone https://github.com/gdivya29-06/expenseiq.git
cd expenseiq
```

### 2. Set up the database
```bash
mysql -u root -p < database/schema.sql
```

### 3. Configure environment variables
Create a `.env` file inside the `backend/` folder:
### 4. Start the backend
```bash
cd backend
npm install
node server.js
```

### 5. Start the frontend
```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## 🚀 Planned Features

- 📱 Mobile application
- ☁️ Cloud storage support
- 📊 Advanced analytics & visualization dashboards

---

> Made with ❤️ — more coming soon!
