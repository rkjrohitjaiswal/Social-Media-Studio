FROM node:20-alpine AS base

WORKDIR /app

# Copy root manifests and lockfile
COPY package*.json ./
COPY packages/config/package*.json ./packages/config/
COPY packages/shared/package*.json ./packages/shared/
COPY packages/database/package*.json ./packages/database/
COPY apps/api/package*.json ./apps/api/

# Install dependencies
RUN npm ci

# Copy full source
COPY . .

# Generate Prisma Client & Build
RUN npm run db:generate --workspace=@ai-social/database
RUN npm run build --workspace=@ai-social/shared
RUN npm run build --workspace=@ai-social/database
RUN npm run build --workspace=@ai-social/api

EXPOSE 4000

ENV PORT=4000
ENV NODE_ENV=production

CMD ["npm", "start", "--workspace=@ai-social/api"]
