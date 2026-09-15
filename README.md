# Yawa-Budget

An AI-powered personal finance tracker built as my NIIT Semester 4 final project.

Problem

Most finance apps assume a steady monthly salary and require manual transaction categorization — which doesn't fit how many students and small business owners actually earn and spend, whether their income is irregular or their time to track it is limited. SmartBudget removes that friction: log a transaction in plain language, and the app categorizes it automatically.

Who it's for

Students managing allowances or side income, and small business owners tracking daily sales and expenses without formal accounting tools — in Nigeria and beyond.

Core Features (MVP)
User authentication (JWT)
Add and view income/expense transactions
AI-assisted automatic transaction categorization
Budget limits per category with a spending dashboard and threshold alerts
"Ask SmartBudget" — natural-language questions about your own spending, answered directly from your data
Account deletion with proper data cleanup
Planned / Stretch Features
Locked savings goals with a server-enforced unlock date
Multiple accounts/wallets with transfers between them
Sandbox payment integration (test mode only — no real money is moved)
Shared/split expenses between users
Admin panel for platform oversight
Tech Stack
Frontend: React
Backend: Java + Spring Boot
Database: PostgreSQL
AI: LLM API integration for categorization and natural-language querying
Status

🚧 In active development. Backend and frontend are being built incrementally, with security and input validation treated as first-class requirements from the start rather than added later.

Why this project

Personal finance is a problem nearly everyone deals with, but most tools make it more tedious than it needs to be. Building this let me combine real backend/database engineering with a practical AI integration — a combination that reflects how full-stack development is actually evolving.

Built by [Yusuf Usman Omeiza] — NIIT Java Full-Stack Track
