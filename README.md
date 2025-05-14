# Attendance Management System (MERN Stack)
A web-based, user-friendly Attendance Management System built using the MERN Stack (MongoDB, Express.js, React.js, Node.js). This system is designed with three separate dashboards for Admin, Faculty, and Student, offering tailored features for each role to streamline attendance tracking, communication, and academic oversight.

# Features

🔐 Authentication & Security

- Secure login system for Admin, Faculty, and Students
- Role-based access control
- Input validations (frontend & backend)
- JWT-based session handling

👤 Admin Dashboard

- CRUD operations on: Students, Teachers, Subjects, Classes
- Assign faculty to classes
- View system-wide data

👨‍🏫 Faculty Dashboard

- Mark, edit, and view attendance
- View Profile
- Manage multiple subjects/classes attendance
- View student queries and respond to them

🎓 Student Dashboard

- View personal attendance record
- View Profile
- Send queries to faculty
- Receive responses from teachers

🌟 UI/UX Enhancements

- Clean, modern, and responsive design
- Dark/Night mode toggle
- Real-time notifications
- Smooth animations and transitions

🛠️ Tech Stack

- MongoDB	NoSQL database for storing users, attendance, queries, etc.
- Express.js	Web framework for Node.js used for creating API endpoints
- React.js	Frontend library for building user interfaces
- Node.js	Backend runtime environment
- JWT, xss, sanitizer html	Authentication mechanism
- Mongoose	ODM for MongoDB
- Axios	HTTP client for frontend-backend communication
- CSS Modules	Styling (update based on what you used)
- Framer Motion	UI animations

📸 Screenshots



🧪 Installation & Setup

# Clone the repo
git clone https://github.com/zohaib-han/Attendance-Management-System
cd attendance-management-system

# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd client
npm install

# Run backend
cd server
npm run dev

# Run frontend
cd client
npm run dev

Make sure MongoDB is running locally on localhost:27017 with db attendance_system.

📬 Contact
For any queries or feedback, feel free to contact me:

📧 Email: [zohaibniazi7372@gmail.com]

🔗 LinkedIn: [https://www.linkedin.com/in/zohaib-khan-75b300247/]
