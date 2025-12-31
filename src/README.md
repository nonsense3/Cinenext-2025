# Skillx Backend

## Setup

1.  **Install Dependencies**:
    ```bash
    composer install
    ```

2.  **Environment Configuration**:
    - Copy `.env.example` to `.env`.
    - Update `.env` with your API keys (Google, Facebook, Microsoft).

3.  **Database Setup**:
    - Ensure the `pdo_sqlite` extension is enabled in your `php.ini`.
    - Run the setup script:
      ```bash
      php create_sqlite_db.php
      ```
    - This will create `data.sqlite` in the backend root.

4.  **Running the Server**:
    - You can use the built-in PHP server:
      ```bash
      cd public
      php -S localhost:8000
      ```

## Directory Structure

- `src/`: Backend logic and helpers.
- `public/`: Web entry points (API endpoints).
- `sql/`: Database schemas.
- `data.sqlite`: SQLite database file.

## Notes

- `facebook/graph-sdk` was removed due to incompatibility with PHP 8.5.
- `App\getPDO()` calls were fixed to `getPDO()`.
