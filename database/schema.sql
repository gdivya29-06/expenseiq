-- ExpenseIQ Database Schema
-- Run this in MySQL to set up your database

CREATE DATABASE IF NOT EXISTS expenseiq;
USE expenseiq;

-- Users Table
CREATE TABLE users (
    user_id ISHOW NT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    phone VARCHAR(15),
    account_type ENUM('individual', 'business') DEFAULT 'individual',
    gst_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories Table
CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT DEFAULT NULL,  -- NULL = system default
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(10),e
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert default system categories
INSERT INTO categories (user_id, name, icon, color) VALUES
(NULL, 'Food & Dining', '🍔', '#FF6B6B'),
(NULL, 'Transportation', '🚗', '#4ECDC4'),
(NULL, 'Shopping', '🛍️', '#45B7D1'),
(NULL, 'Entertainment', '🎬', '#96CEB4'),
(NULL, 'Utilities', '💡', '#FFEAA7'),
(NULL, 'Healthcare', '🏥', '#DDA0DD'),
(NULL, 'Education', '📚', '#98D8C8'),
(NULL, 'Rent', '🏠', '#F7DC6F'),
(NULL, 'Salary', '💰', '#82E0AA'),
(NULL, 'Other', '📌', '#AEB6BF');

-- Expenses Table
CREATE TABLE expenses (
    expense_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255),
    expense_date DATE NOT NULL,
    type ENUM('income', 'expense') DEFAULT 'expense',
    source ENUM('manual', 'import', 'ocr', 'auto') DEFAULT 'manual',
    gst_amount DECIMAL(10, 2) DEFAULT 0.00,
    gst_percent DECIMAL(5, 2) DEFAULT 0.00,
    receipt_url VARCHAR(500),
    import_batch_id INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Tags Table
CREATE TABLE tags (
    tag_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Expense Tags (M:N junction)
CREATE TABLE expense_tags (
    expense_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (expense_id, tag_id),
    FOREIGN KEY (expense_id) REFERENCES expenses(expense_id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(tag_id) ON DELETE CASCADE
);

-- Budgets Table
CREATE TABLE budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT,
    monthly_limit DECIMAL(12, 2) NOT NULL,
    month INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

-- Alerts Table
CREATE TABLE alerts (
    alert_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    budget_id INT,
    message VARCHAR(255) NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (budget_id) REFERENCES budgets(budget_id)
);

-- Import Batches Table
CREATE TABLE import_batches (
    batch_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    filename VARCHAR(255),
    total_rows INT,
    imported_rows INT,
    failed_rows INT DEFAULT 0,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Add import_batch_id FK to expenses
ALTER TABLE expenses ADD CONSTRAINT fk_import_batch
FOREIGN KEY (import_batch_id) REFERENCES import_batches(batch_id);

-- ============================================================
-- TRIGGERS
-- ============================================================

DELIMITER $$

-- Trigger: Alert when budget exceeded
CREATE TRIGGER budget_exceed_alert
AFTER INSERT ON expenses
FOR EACH ROW
BEGIN
    DECLARE spent DECIMAL(12,2);
    DECLARE budget_limit DECIMAL(12,2);
    DECLARE bid INT;

    IF NEW.type = 'expense' THEN
        SELECT b.budget_id, b.monthly_limit INTO bid, budget_limit
        FROM budgets b
        WHERE b.user_id = NEW.user_id
          AND b.category_id = NEW.category_id
          AND b.month = MONTH(NEW.expense_date)
          AND b.year = YEAR(NEW.expense_date)
        LIMIT 1;

        IF bid IS NOT NULL THEN
            SELECT SUM(amount) INTO spent
            FROM expenses
            WHERE user_id = NEW.user_id
              AND category_id = NEW.category_id
              AND MONTH(expense_date) = MONTH(NEW.expense_date)
              AND YEAR(expense_date) = YEAR(NEW.expense_date)
              AND type = 'expense';

            IF spent > budget_limit THEN
                INSERT INTO alerts (user_id, budget_id, message)
                VALUES (NEW.user_id, bid, CONCAT('Budget exceeded! You have spent ₹', spent, ' against limit of ₹', budget_limit));
            END IF;
        END IF;
    END IF;
END$$

-- Trigger: Prevent expense over ₹1,00,000 without confirmation flag
CREATE TRIGGER prevent_large_expense
BEFORE INSERT ON expenses
FOR EACH ROW
BEGIN
    IF NEW.amount > 100000 AND NEW.source = 'manual' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Large expense requires confirmation. Please use the confirmed flag.';
    END IF;
END$$

DELIMITER ;

-- ============================================================
-- STORED PROCEDURE: Monthly Summary
-- ============================================================

DELIMITER $$
CREATE PROCEDURE get_monthly_summary(IN uid INT, IN m INT, IN y INT)
BEGIN
    SELECT 
        c.name AS category,
        SUM(e.amount) AS total_spent,
        b.monthly_limit,
        ROUND((SUM(e.amount) / b.monthly_limit) * 100, 1) AS percent_used
    FROM expenses e
    JOIN categories c ON e.category_id = c.category_id
    LEFT JOIN budgets b ON b.user_id = e.user_id 
        AND b.category_id = e.category_id 
        AND b.month = m AND b.year = y
    WHERE e.user_id = uid
      AND MONTH(e.expense_date) = m
      AND YEAR(e.expense_date) = y
      AND e.type = 'expense'
    GROUP BY c.name, b.monthly_limit;
END$$
DELIMITER ;
