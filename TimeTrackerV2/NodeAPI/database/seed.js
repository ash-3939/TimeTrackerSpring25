var localStorage = require("node-localstorage").LocalStorage;
const ConnectToDB = require("./DBConnection");

let db = ConnectToDB();
localStorage = new localStorage("./scratch");

//db.serialize();  // Serialize all following commands (not needed because we only need to serialize the Users and Profile tables and all actions attached to them) https://stackoverflow.com/questions/72620312/in-node-sqlite3-how-to-wait-until-run-is-finished

// Run the following database commands in serialized mode. I.E. only one statement can execute at a time. Other statements will wait in a queue until all the previous statements are executed.  https://www.sqlitetutorial.net/sqlite-nodejs/statements-control-flow/
db.serialize(() => {
    // Create the Users table
    db.run(
        // isApproved goes under type for ALL statements - added
        `CREATE TABLE IF NOT EXISTS Users(
        userID INTEGER PRIMARY KEY, 
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        type TEXT NOT NULL,
        isApproved BOOL NOT NULL,
        isActive BOOL NOT NULL,
        salt TEXT NOT NULL
        );`
    )
        // Create the Profiles table
        .run(
            `CREATE TABLE IF NOT EXISTS Profiles(
        userID INTEGER NOT NULL,
        pronouns TEXT,
        bio TEXT,
        contact TEXT,
        FOREIGN KEY (userID) REFERENCES Users (userID) ON DELETE CASCADE
        );`
        )
        //  Create a trigger for the Users table that will insert a new entry into the Profiles table
        .run(
            `CREATE TRIGGER IF NOT EXISTS usersTrigger
        AFTER INSERT ON Users
        BEGIN
            INSERT INTO Profiles(userID) VALUES (new.userID);
        END;`
        )
        // Create a super admin account or update and enable the super admin with a username and password of "admin" if there are no active admins in the DB
        // It is formatted this way because the syntax order for this type of insert has to be INSERT ... SELECT instead of INSERT ... VALUES https://stackoverflow.com/a/66644198 and https://mitch.codes/sql-tip-insert-where-not-exists/
        .run(
            // isApproved added
            `INSERT OR REPLACE INTO Users(userID, username, password, firstName, lastName, type, isApproved, isActive, salt)
        SELECT (SELECT userID  -- This is allowed because if default admin account has been deleted, a new primary key will be assigned to the default admin account
            FROM Users
            WHERE password = '729698d2e7e3f792312a663f441767813c2e15465836f2c11300f9daafbd9fc36da0c0dc1e06c02e473e8fb76a8e58ad4673e9d833304ccaa733c2d667bb1fc1' AND salt = '851d1de4be2b408af82cb83255136747'  -- We sort the results using the password and salt fields because it is very unlikely that these will be regenerated by another user
            ), 'admin', '729698d2e7e3f792312a663f441767813c2e15465836f2c11300f9daafbd9fc36da0c0dc1e06c02e473e8fb76a8e58ad4673e9d833304ccaa733c2d667bb1fc1', 'sudo', 'admin', 'admin', true, true, '851d1de4be2b408af82cb83255136747'
        WHERE NOT EXISTS (
            SELECT userID
            FROM Users
            WHERE type = 'admin' AND isActive = true
            LIMIT 1
        );`,
            [],
            function (err) {
                // Can' use a lambda function for some reason as described here https://github.com/TryGhost/node-sqlite3/issues/962 and as shown here https://medium.com/@codesprintpro/getting-started-sqlite3-with-nodejs-8ef387ad31c4#:~:text=without%20touching%20it.-,Executing%20run()%20Method,-All%20the%20above
                if (err) {
                    console.log(
                        "The following error happened with the insert of the default admin."
                    );
                    console.log(err);
                    localStorage.setItem(
                        "defaultAdminCreatedOrEnabledAndNotViewed",
                        false
                    );
                }
                // If the a row was inserted, then "this.lastID" returns the ID of the row it was inserted into.  And because any thing above 0 is considered true, set the variable "global.defaultAdminCreated" to true because the default admin account was inserted.
                else if (this.lastID) {
                    console.log(
                        `Default admin account created/enabled with an ID of: ${this.lastID}`
                    );
                    localStorage.setItem(
                        "defaultAdminCreatedOrEnabledAndNotViewed",
                        true
                    );
                }
                else {
                    localStorage.setItem(
                        "defaultAdminCreatedOrEnabledAndNotViewed",
                        false
                    );
                }
            }
        );
});

// Create the TimeCard table
db.run(`CREATE TABLE IF NOT EXISTS TimeCard(
    timeslotID INTEGER PRIMARY KEY,
    timeCardCreation TEXT NOT NULL,
    isManualEntry bool NOT NULL,
    timeIn TEXT NOT NULL,
    timeOut TEXT,
    isEdited bool NOT NULL,
    userID INTEGER NOT NULL,
    description TEXT,
    projectID INT NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users (userID) ON DELETE CASCADE,
    FOREIGN KEY (projectID) REFERENCES Projects (projectID) ON DELETE CASCADE
);`);

// Create the Courses table
db.run(`CREATE TABLE IF NOT EXISTS Courses(
    courseID INTEGER PRIMARY KEY, 
    courseName TEXT NOT NULL,
    isActive BOOL NOT NULL,
    instructorID INTEGER NOT NULL,
    description TEXT,
    FOREIGN KEY (instructorID) REFERENCES Users (userID) ON DELETE CASCADE
);`);

// Create the Projects table
db.run(`CREATE TABLE IF NOT EXISTS Projects(
    projectID INTEGER PRIMARY KEY, 
    projectName TEXT NOT NULL,
    isActive BOOL NOT NULL,
    courseID INTEGER NOT NULL,
    description TEXT,
    FOREIGN KEY (courseID) REFERENCES Courses (courseID) ON DELETE CASCADE
);`);

// Create the Course_Users join table
db.run(`CREATE TABLE IF NOT EXISTS Course_Users(
    userID INTEGER NOT NULL,
    courseID INTEGER NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users (userID) ON DELETE CASCADE,
    FOREIGN KEY (courseID) REFERENCES Courses (courseID) ON DELETE CASCADE
);`);

// Create the Project_Users join table
db.run(`CREATE TABLE IF NOT EXISTS Project_Users(
    userID INTEGER NOT NULL,
    projectID INTEGER NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users (userID) ON DELETE CASCADE,
    FOREIGN KEY (projectID) REFERENCES Projects (projectID) ON DELETE CASCADE
);`);

// Create the Pend_Course_Users join table
db.run(`CREATE TABLE IF NOT EXISTS Pend_Course_Users(
    userID INTEGER NOT NULL,
    courseID INTEGER NOT NULL,
    FOREIGN KEY (userID) REFERENCES Users (userID) ON DELETE CASCADE,
    FOREIGN KEY (courseID) REFERENCES Courses (courseID) ON DELETE CASCADE
);`);

// Create the Eval Template table
db.run(
    `CREATE TABLE IF NOT EXISTS Template (
      templateID INTEGER PRIMARY KEY AUTOINCREMENT,
      templateName TEXT NOT NULL,
      evaluatorID INTEGER NOT NULL,
      FOREIGN KEY (evaluatorID) REFERENCES Users (userID)
);`);

// Create the Assigned_Eval table
db.run(
    `CREATE TABLE IF NOT EXISTS Assigned_Eval (
        assignedEvalID INTEGER PRIMARY KEY,
        evaluatorID INTEGER NOT NULL,
        evaluateeID INTEGER NOT NULL,
        templateID INTEGER NOT NULL,
        projectID INTEGER NOT NULL,
        evalCompleted BOOL NOT NULL,
        FOREIGN KEY (evaluatorID) REFERENCES Users (userID) ON DELETE CASCADE,
        FOREIGN KEY (evaluateeID) REFERENCES Users (userID) ON DELETE CASCADE,
        FOREIGN KEY (templateID) REFERENCES Template (templateID) ON DELETE CASCADE,
        FOREIGN KEY (projectID) REFERENCES Projects (projectID) ON DELETE CASCADE
);`);

// Create the Question Type lookup table and insert the default items
db.run(`CREATE TABLE IF NOT EXISTS Question_Type (
    questionTypeID INTEGER PRIMARY KEY AUTOINCREMENT,
    questionTypeText TEXT NOT NULL UNIQUE
    );`,
    (err) => {
        if (err) {
            console.error(err.message);
        }
        else {
            // console.log('Question_Type table created.');

            // Insert the default entries only if they do not exist
            const insertDefaultQuestionTypes = `
                INSERT INTO Question_Type (questionTypeText)
                SELECT '1-5 Rating'
                WHERE NOT EXISTS (
                    SELECT 1 FROM Question_Type WHERE questionTypeText = '1-5 Rating'
                )
                UNION ALL
                SELECT 'Text Response'
                WHERE NOT EXISTS (
                    SELECT 1 FROM Question_Type WHERE questionTypeText = 'Text Response'
                );`;
            db.run(insertDefaultQuestionTypes,
                (err) => {
                    if (err) {
                        console.error(err.message);
                    }
                    else {
                        console.log('Default question types inserted or already exists.');
                    }
                }
            );
        }
    }
);

// Create Eval Questions table
db.run(`CREATE TABLE IF NOT EXISTS Question (
    questionID INTEGER PRIMARY KEY AUTOINCREMENT,
    questionText TEXT NOT NULL,
    questionType INTEGER NOT NULL,
    templateID INTEGER NOT NULL,
    FOREIGN KEY (templateID) REFERENCES Template (templateID) ON DELETE CASCADE,
    FOREIGN KEY (questionType) REFERENCES Question_Type (questionTypeID) ON DELETE CASCADE
);`);

// Create Eval Responses table (not yet in use)
db.run(`CREATE TABLE IF NOT EXISTS Response (
    responseID INTEGER PRIMARY KEY AUTOINCREMENT,
    assignedEvalID INTEGER NOT NULL,
    userID INTEGER NOT NULL,
    questionID INTEGER NOT NULL,
    rating INTEGER,
    response TEXT,
    FOREIGN KEY (assignedEvalID) REFERENCES Assigned_Eval(assignedEvalID)
    FOREIGN KEY (userID) REFERENCES Users(userID),
    FOREIGN KEY (questionID) REFERENCES Question(questionID)
);`);

db.close(); // Close the connection because it doesn't need to be persistent for the creation of the DB

// isApproved added to all relevant statements
