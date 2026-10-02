-- DEVELOPMENT ONLY: demo users, projects and tasks for a local database.
-- Never run this against production. It is deliberately NOT in db/migrations,
-- so `dbmate up` does not apply it. To load it into a local database:
--   psql "$DATABASE_URL" -f db/seeds/dev_seed.sql
-- It only inserts; the old "down" half (which deleted every table's rows) was dropped on purpose.

-- ============================================
-- Seed users first
-- ============================================

INSERT INTO users (
    email,
    full_name,
    password_hash
)
VALUES
    ('john@example.com', 'John Doe', 'hash1'),
    ('jane@example.com', 'Jane Smith', 'hash2'),
    ('bob@example.com', 'Bob Wilson', 'hash3'),
    ('alice@example.com', 'Alice Brown', 'hash4');


-- ============================================
-- Seed user_profiles
-- ============================================

INSERT INTO user_profiles (
    user_id,
    avatar_url,
    bio,
    phone
)
SELECT
    id,
    'https://example.com/avatar/' ||
        REPLACE(email, '@example.com', '') ||
        '.jpg',
    CASE
        WHEN email = 'john@example.com'
            THEN 'Project Manager with 5 years experience'
        WHEN email = 'jane@example.com'
            THEN 'Senior Developer'
        WHEN email = 'bob@example.com'
            THEN 'UX Designer'
        WHEN email = 'alice@example.com'
            THEN 'Business Analyst'
        ELSE 'User'
    END,
    CASE
        WHEN email = 'john@example.com' THEN '+123456789'
        WHEN email = 'jane@example.com' THEN '+123456780'
        WHEN email = 'bob@example.com' THEN '+123456781'
        WHEN email = 'alice@example.com' THEN '+123456782'
    END
FROM users
WHERE email IN (
    'john@example.com',
    'jane@example.com',
    'bob@example.com',
    'alice@example.com'
);


-- ============================================
-- Seed projects
-- ============================================

INSERT INTO projects (
    name,
    description,
    status,
    owner_id
)
SELECT
    project.name,
    project.description,
    project.status::project_status,
    users.id
FROM (
    VALUES
        (
            'Website Redesign',
            'Redesign the company website',
            'active',
            'john@example.com'
        ),
        (
            'Mobile App Development',
            'Develop the mobile application',
            'active',
            'jane@example.com'
        ),
        (
            'Database Migration',
            'Migrate the legacy database to PostgreSQL',
            'completed',
            'john@example.com'
        )
) AS project(name, description, status, owner_email)
JOIN users
    ON users.email = project.owner_email;


-- ============================================
-- Seed tasks
-- ============================================

INSERT INTO tasks (
    project_id,
    title,
    description,
    priority,
    status,
    due_date,
    assigned_to
)
SELECT
    projects.id,
    task.title,
    task.description,
    task.priority,
    task.status::task_status,
    task.due_date::DATE,
    users.id
FROM (
    VALUES
        (
            'Website Redesign',
            'Design homepage',
            'Create the new homepage design',
            5,
            'in_progress',
            '2026-09-10',
            'jane@example.com'
        ),
        (
            'Website Redesign',
            'Implement responsive layout',
            'Make the website responsive on all devices',
            4,
            'pending',
            '2026-09-15',
            'bob@example.com'
        ),
        (
            'Website Redesign',
            'Setup authentication',
            'Implement user authentication',
            5,
            'pending',
            '2026-09-20',
            'john@example.com'
        ),
        (
            'Mobile App Development',
            'Create login screen',
            'Build mobile login screen',
            4,
            'completed',
            '2026-09-05',
            'jane@example.com'
        ),
        (
            'Mobile App Development',
            'Create dashboard',
            'Build the mobile dashboard',
            3,
            'in_progress',
            '2026-09-12',
            'alice@example.com'
        ),
        (
            'Database Migration',
            'Backup old database',
            'Create backup before migration',
            5,
            'completed',
            '2026-08-20',
            'john@example.com'
        )
) AS task(
    project_name,
    title,
    description,
    priority,
    status,
    due_date,
    assigned_email
)
JOIN projects
    ON projects.name = task.project_name
LEFT JOIN users
    ON users.email = task.assigned_email;


-- ============================================
-- Seed project members
-- ============================================

INSERT INTO project_members (
    project_id,
    user_id,
    role
)
SELECT
    projects.id,
    users.id,
    members.role::member_role
FROM (
    VALUES
        (
            'Website Redesign',
            'john@example.com',
            'owner'
        ),
        (
            'Website Redesign',
            'jane@example.com',
            'admin'
        ),
        (
            'Website Redesign',
            'bob@example.com',
            'member'
        ),
        (
            'Mobile App Development',
            'jane@example.com',
            'owner'
        ),
        (
            'Mobile App Development',
            'alice@example.com',
            'admin'
        ),
        (
            'Mobile App Development',
            'bob@example.com',
            'member'
        ),
        (
            'Database Migration',
            'john@example.com',
            'owner'
        ),
        (
            'Database Migration',
            'alice@example.com',
            'member'
        )
) AS members(
    project_name,
    user_email,
    role
)
JOIN projects
    ON projects.name = members.project_name
JOIN users
    ON users.email = members.user_email;
