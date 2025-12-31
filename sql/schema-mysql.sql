-- MySQL Schema for Skillx Chat
CREATE DATABASE IF NOT EXISTS skillx_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE skillx_chat;
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provider VARCHAR(50) DEFAULT NULL,
  provider_id VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL,
  password_hash VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email),
  INDEX idx_users_provider (provider, provider_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_name VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_anonymous TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_messages_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
