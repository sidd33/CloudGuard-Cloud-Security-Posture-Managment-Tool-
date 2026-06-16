# CloudGuard CSPM Platform

CloudGuard is a production-grade AWS Cloud Security Posture Management (CSPM) platform built with Spring Boot and Next.js.

## Architecture
- **Backend:** Spring Boot 3.x, Java 21, Spring Data MongoDB, AWS SDK v2
- **Frontend:** Next.js 14, React 18, Tailwind CSS, Recharts
- **Database:** MongoDB Atlas

## Getting Started

### Prerequisites
1. Java 21
2. Node.js 20+
3. MongoDB Atlas Cluster

### Backend Setup
1. Open the `backend` directory.
2. Edit `src/main/resources/application.yml` or set environment variables:
   ```bash
   export MONGODB_URI="mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/cloudguard"
   export CLOUDGUARD_ENCRYPTION_KEY="12345678901234567890123456789012" # 32 bytes
   export JWT_SECRET="your_secure_jwt_secret_key_needs_to_be_long"
   ```
3. Run `mvn spring-boot:run`.

### Frontend Setup
1. Open the `frontend` directory.
2. Run `npm install`.
3. Run `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

### Usage
1. Navigate to the frontend UI.
2. Click **Onboard Account** and provide your AWS Access Key, Secret Key, and Region.
3. The backend will securely validate and encrypt your keys, then immediately begin scanning your resources (S3, IAM, EC2).
4. View real-time security posture updates on the Dashboard.
