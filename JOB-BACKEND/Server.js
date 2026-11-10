const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authMiddleware = require("./authMiddleware");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { poolPromise, sql } = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "Uploads")));

const port = 4000;

app.get("/", (req, res) => {
  res.send("Hello World");
});

/*MULTER*/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "Uploads", "resumes"));
  },

  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, and DOCX files are allowed"));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

/*USER*/

app.get("/Users", async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query("select * from Users");
    res.status(200).json(result.recordset);
  } catch (err) {
    console.log("Error Fetching Users", err);

    res.status(500).json({
      message: "Failed to fetch Users",
    });
  }
});

/*REGISTER*/

app.post("/register", async (req, res) => {
  let transaction;
  try {
    const {
      name,
      email,
      password,
      role,
      phone,
      location,
      companyName,
      companyDescription,
    } = req.body;

    if (!email || !password || !role || !name || !phone) {
      return res.status(400).json({
        message: "Invalid Data",
      });
    }

    if (role !== "Candidate" && role !== "Recruiter") {
      return res.status(400).json({
        message: "Bad Request or Invalid Role",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password Must Contain 6 Characters",
      });
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return res.status(400).json({
        message: "Invalid Email",
      });
    }

    const phonePattern = /^[6789][0-9]{9}$/;

    if (!phonePattern.test(phone)) {
      return res.status(400).json({
        message: "Invalid Phone Number",
      });
    }

    const pool = await poolPromise;

    const request = pool.request();
    request.input("email", email);

    const result = await request.query(
      `select * from users where Email=@email`,
    );

    if (result.recordset.length > 0) {
      return res.status(409).json({
        message: "Email already Exists",
      });
    }

    if (role === "Candidate" && !location) {
      return res.status(400).json({
        message: "Location Needed",
      });
    }

    if (role === "Recruiter" && (!companyName || !companyDescription)) {
      return res.status(400).json({
        message: "Bad Request or InComplete Data",
      });
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    transaction = pool.transaction();

    await transaction.begin();

    const insertRequest = transaction.request();

    insertRequest.input("Name", sql.VarChar, name);
    insertRequest.input("Email", sql.VarChar, email);
    insertRequest.input("Password", sql.VarChar, hashedpassword);
    insertRequest.input("Role", sql.VarChar, role);
    insertRequest.input("IsActive", sql.Bit, true);

    const insertResult = await insertRequest.query(`
        insert into Users(Name,Email,Password,Role,IsActive)
        OUTPUT INSERTED.UserID
        values(@Name,@Email,@Password,@Role,@IsActive)
        `);

    const userId = insertResult.recordset[0].UserID;

    if (role === "Candidate") {
      const candidateRequest = transaction.request();

      candidateRequest.input("UserID", sql.Int, userId);
      candidateRequest.input("Phone", sql.VarChar, phone);
      candidateRequest.input("Location", sql.VarChar, location);

      await candidateRequest.query(
        `insert into Candidates (UserID,Phone,Location)
        values(@UserID,@Phone,@Location)`,
      );
    }

    if (role === "Recruiter") {
      const recruiterRequest = transaction.request();

      recruiterRequest.input("UserID", sql.Int, userId);
      recruiterRequest.input("CompanyName", sql.VarChar, companyName);
      recruiterRequest.input(
        "CompanyDescription",
        sql.VarChar,
        companyDescription,
      );
      recruiterRequest.input("Phone", sql.VarChar, phone);

      await recruiterRequest.query(
        `insert into Recruiters(UserID,CompanyName,CompanyDescription,Phone)
        values(@UserID,@CompanyName,@CompanyDescription,@Phone)`,
      );
    }

    await transaction.commit();
    res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    if (transaction) {
      await transaction.rollback();
    }

    console.log("Registration error:", err);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

/*LOGIN */

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Invalid Password or Email",
      });
    }

    const pool = await poolPromise;

    const loginRequest = pool.request();

    loginRequest.input("Email", sql.VarChar, email);

    const result = await loginRequest.query(
      `select UserID,Name,Email,Password,Role,IsActive
        from Users where Email=@Email`,
    );
    if (result.recordset.length === 0) {
      return res.status(401).json({
        message: "Invalid Email or Password",
      });
    }

    const user = result.recordset[0];

    if (!user.IsActive) {
      return res.status(403).json({
        message: "Your Account is InActive",
      });
    }
    const storedPassword = user.Password;

    const isPasswordCorrect = await bcrypt.compare(password, storedPassword);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid Password",
      });
    }

    const token = jwt.sign(
      {
        userId: user.UserID,
        role: user.Role,
      },
      process.env.JWT_SECRET,
    );

    res.status(200).json({
      message: "Login Successfull",
      token: token,
      user: {
        userId: user.UserID,
        name: user.Name,
        role: user.Role,
      },
    });
  } catch (err) {
    console.log("Login Error", err);
    res.status(500).json({
      message: "Server error",
    });
  }
});

/*PROFILE*/

app.get("/profile", authMiddleware, async (req, res) => {
  res.json({
    message: "Profile Accessed",
    user: req.user,
  });
});

/*RECRUITER JOB POSTING*/

app.post("/jobs", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const {
      jobTitle,
      description,
      location,
      salaryMin,
      salaryMax,
      experienceRequired,
      jobType,
      skillsRequired,
    } = req.body;

    if (
      !jobTitle ||
      !description ||
      !location ||
      experienceRequired === undefined ||
      experienceRequired === null ||
      !jobType ||
      !skillsRequired
    ) {
      return res.status(400).json({
        message: "Invalid Data",
      });
    }

    if (
      salaryMin === undefined ||
      salaryMin === null ||
      salaryMax === undefined ||
      salaryMax === null
    ) {
      return res.status(400).json({
        message: "Salary is Required",
      });
    }

    if (isNaN(salaryMin) || isNaN(salaryMax) || isNaN(experienceRequired)) {
      return res.status(400).json({
        message: "Salary and Experience Must be a Number",
      });
    }

    if (salaryMin < 0 || salaryMax < 0) {
      return res.status(400).json({
        message: "Salary Cannot be Negative",
      });
    }

    if (salaryMin > salaryMax) {
      return res.status(400).json({
        message: "Invalid Salary Range",
      });
    }
    if (
      jobType !== "Full-time" &&
      jobType !== "Part-time" &&
      jobType !== "Internship"
    ) {
      return res.status(400).json({
        message: "Invalid JobType",
      });
    }

    if (experienceRequired < 0) {
      return res.status(400).json({
        message: "Experience Cannot be Negative",
      });
    }

    const pool = await poolPromise;

    const recruiterRequest = pool.request();
    recruiterRequest.input("UserID", sql.Int, req.user.userId);
    const recruiterResult = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    const recruiterId = recruiterResult.recordset[0].RecruiterID;

    const jobRequest = pool.request();

    jobRequest.input("RecruiterID", sql.Int, recruiterId);
    jobRequest.input("JobTitle", sql.VarChar, jobTitle);
    jobRequest.input("Description", sql.VarChar, description);
    jobRequest.input("Location", sql.VarChar, location);
    jobRequest.input("SalaryMin", sql.Int, salaryMin);
    jobRequest.input("SalaryMax", sql.Int, salaryMax);
    jobRequest.input("ExperienceRequired", sql.Int, experienceRequired);
    jobRequest.input("JobType", sql.VarChar, jobType);
    jobRequest.input("SkillsRequired", sql.VarChar, skillsRequired);

    await jobRequest.query(
      `insert into Jobs(RecruiterID,JobTitle,Description,Location,SalaryMin,SalaryMax,ExperienceRequired,JobType,SkillsRequired)
  values(@RecruiterID,@JobTitle,@Description,@Location,@SalaryMin,@SalaryMax,@ExperienceRequired,@JobType,@SkillsRequired)`,
    );

    return res.status(201).json({
      message: "Job Created Successfully",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE-----> VIEW PROFILE*/

app.get("/candidates/profile", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;
    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, userId);

    const candidateIdResult = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );

    if (candidateIdResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    const candidateId = candidateIdResult.recordset[0].CandidateID;

    const profileRequest = pool.request();

    profileRequest.input("CandidateID", sql.Int, candidateId);

    const result = await profileRequest.query(
      `select c.CandidateID,u.Name,u.Email,c.Phone,c.Location,c.ResumePath,c.CreatedAt from Users u inner join Candidates c on u.UserID=c.UserID  where c.CandidateID=@CandidateID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "User Details Not found",
      });
    }

    return res.status(200).json({
      message: "User Details",
      Details: result.recordset,
    });
  } catch (err) {
    console.log("Error in Getting Profile", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE UPDATE PROFILE*/

app.put("/candidates/profile", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, userId);

    const result = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    const { phone, location } = req.body;

    const phonePattern = /^[6789][0-9]{9}$/;

    if (!location) {
      return res.status(400).json({
        message: "Invalid Details Or Incomplete Details",
      });
    }

    if (!phonePattern.test(phone)) {
      return res.status(400).json({
        message: "Invalid Phone Number",
      });
    }

    const candidateId = result.recordset[0].CandidateID;

    const profileUpdateRequest = pool.request();

    profileUpdateRequest.input("CandidateID", sql.Int, candidateId);
    profileUpdateRequest.input("Phone", sql.VarChar, phone);
    profileUpdateRequest.input("Location", sql.VarChar, location);
    await profileUpdateRequest.query(
      `update Candidates set Phone=@Phone,Location=@Location where CandidateID=@CandidateID`,
    );

    return res.status(200).json({
      message: "Profile Updated Successfully",
    });
  } catch (err) {
    console.log("Error in Updating Profile", err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*POST RESUME*/

app.post(
  "/candidates/resume",
  authMiddleware,
  upload.single("resume"),
  async (req, res) => {
    try {
      if (req.user.role !== "Candidate") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const UserId = req.user.userId;

      const pool = await poolPromise;
      const candidateIdRequest = pool.request();

      candidateIdRequest.input("UserID", sql.Int, UserId);

      const result = await candidateIdRequest.query(
        `select CandidateID from Candidates where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Candidate Not found",
        });
      }

      const candidateId = result.recordset[0].CandidateID;

      if (!req.file) {
        return res.status(400).json({
          message: "Please Upload the Resume",
        });
      }

      const resumePath = req.file.path;

      const resumeRequest = pool.request();

      resumeRequest.input("CandidateID", sql.Int, candidateId);
      resumeRequest.input("ResumePath", sql.VarChar, resumePath);

      const resumeResult = await resumeRequest.query(
        `update Candidates set ResumePath=@ResumePath where CandidateID=@CandidateID`,
      );
      console.log("CandidateID:", candidateId);
      console.log("ResumePath:", resumePath);
      console.log("Rows affected:", resumeResult.rowsAffected);

      return res.status(200).json({
        message: "Resume Uploaded Successfully",
      });
    } catch (err) {
      console.log("Error in Uploading Resume", err);
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*VIEW CANDIDATE RESUME*/

app.get("/candidates/resume", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateRequest = pool.request();

    candidateRequest.input("UserID", sql.Int, userId);

    const result = await candidateRequest.query(
      "SELECT CandidateID FROM Candidates WHERE UserID = @UserID",
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    const candidateId = result.recordset[0].CandidateID;

    const resumeRequest = pool.request();

    resumeRequest.input("CandidateID", sql.Int, candidateId);

    const resumeResult = await resumeRequest.query(
      "SELECT ResumePath FROM Candidates WHERE CandidateID = @CandidateID",
    );

    if (resumeResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Resume Not Found",
      });
    }

    const resume = resumeResult.recordset[0].ResumePath;

    if (!resume) {
      return res.status(404).json({
        message: "Resume Not Found",
      });
    }

    const uploadDirectory = path.resolve(__dirname, "Uploads");

    const resumeFilePath = path.resolve(resume);

    if (!resumeFilePath.startsWith(uploadDirectory + path.sep)) {
      return res.status(400).json({
        message: "Invalid Resume Path",
      });
    }

    if (!fs.existsSync(resumeFilePath)) {
      return res.status(404).json({
        message: "Resume File Not Found",
      });
    }

    return res.download(resumeFilePath, (err) => {
      if (err && !res.headersSent) {
        return res.status(500).json({
          message: "Unable to Download Resume",
        });
      }
    });
  } catch (err) {
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER VIEW CANDIDATE RESUME*/

app.get(
  "/applications/recruiter/:candidateId/resume",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;
      const candidateId = Number(req.params.candidateId);

      if (!Number.isInteger(candidateId) || candidateId <= 0) {
        return res.status(400).json({
          message: "Invalid Candidate ID",
        });
      }

      const pool = await poolPromise;

      const recruiterRequest = pool.request();

      recruiterRequest.input("UserID", sql.Int, userId);

      const recruiterResult = await recruiterRequest.query(
        "SELECT RecruiterID FROM Recruiters WHERE UserID = @UserID",
      );

      if (recruiterResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterId = recruiterResult.recordset[0].RecruiterID;

      const applicationRequest = pool.request();

      applicationRequest.input("CandidateID", sql.Int, candidateId);
      applicationRequest.input("RecruiterID", sql.Int, recruiterId);

      const applicationResult = await applicationRequest.query(`
      SELECT TOP 1 ApplicationID
      FROM Applications a
      INNER JOIN Jobs j ON a.JobID = j.JobID
      WHERE a.CandidateID = @CandidateID
        AND j.RecruiterID = @RecruiterID
    `);

      if (applicationResult.recordset.length === 0) {
        return res.status(403).json({
          message: "You are not authorized to view this candidate's resume",
        });
      }

      const resumeRequest = pool.request();

      resumeRequest.input("CandidateID", sql.Int, candidateId);

      const resumeResult = await resumeRequest.query(
        "SELECT ResumePath FROM Candidates WHERE CandidateID = @CandidateID",
      );

      if (resumeResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Candidate Not Found",
        });
      }

      const resume = resumeResult.recordset[0].ResumePath;

      if (!resume) {
        return res.status(404).json({
          message: "Resume Not Found",
        });
      }

      const uploadDirectory = path.resolve(__dirname, "Uploads");
      const resumeFilePath = path.resolve(resume);

      if (!resumeFilePath.startsWith(uploadDirectory + path.sep)) {
        return res.status(400).json({
          message: "Invalid Resume Path",
        });
      }

      if (!fs.existsSync(resumeFilePath)) {
        return res.status(404).json({
          message: "Resume File Not Found",
        });
      }

      return res.download(resumeFilePath, (err) => {
        if (err && !res.headersSent) {
          return res.status(500).json({
            message: "Unable to Download Resume",
          });
        }
      });
    } catch (err) {
      console.log(err);

      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*VIEW AVAILABLE JOB*/

app.get("/jobs", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "You are not authorized to view available jobs",
      });
    }

    const { keyword, location, jobtype, experience, salaryMin, salaryMax } =
      req.query;

    const conditions = [];
    const pool = await poolPromise;
    const request = pool.request();

    if (keyword) {
      conditions.push("j.JobTitle LIKE '%' + @Keyword + '%'");
      request.input("Keyword", sql.VarChar, keyword);
    }

    if (location) {
      conditions.push("j.Location LIKE '%' + @Location + '%'");
      request.input("Location", sql.VarChar, location);
    }

    if (jobtype) {
      conditions.push("j.JobType = @JobType");
      request.input("JobType", sql.VarChar, jobtype);
    }

    if (experience !== undefined && experience !== "") {
      conditions.push("j.ExperienceRequired <= @Experience");
      request.input("Experience", sql.Int, experience);
    }

    if (salaryMin !== undefined && salaryMin !== "") {
      conditions.push("j.SalaryMax >= @SalaryMin");
      request.input("SalaryMin", sql.Int, salaryMin);
    }

    if (salaryMax !== undefined && salaryMax !== "") {
      conditions.push("j.SalaryMin <= @SalaryMax");
      request.input("SalaryMax", sql.Int, salaryMax);
    }

    const whereClause = conditions.length
      ? "WHERE " + conditions.join(" AND ")
      : "";

    const jobResult = await request.query(`
      SELECT
        j.JobID,
        j.JobTitle,
        j.Location,
        j.SalaryMin,
        j.SalaryMax,
        j.JobType,
        j.ExperienceRequired,
        r.CompanyName
      FROM Jobs j
      INNER JOIN Recruiters r
        ON j.RecruiterID = r.RecruiterID
      ${whereClause}
    `);

    return res.status(200).json({
      Jobs: jobResult.recordset,
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

app.get("/skills", async (req, res) => {
  try {
    const pool = await poolPromise;

    const request = pool.request();

    const result = await request.query(`select * From Skills order by SkillID`);

    if (result.recordset.length === 0) {
      return res.status(200).json({
        message: "Skills Not found",
      });
    }

    return res.status(200).json({
      message: "Skills",
      skills: result.recordset,
    });
  } catch (err) {
    console.log("Error in Getting Skills");
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE ADD SKILL*/

app.post("/candidates/skills", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const Id = req.body.skillId;

    const skillID = Number(Id);

    if (!Number.isInteger(skillID)) {
      return res.status(400).json({
        message: "SkillID Should be an Integer",
      });
    }

    const UserId = req.user.userId;

    const pool = await poolPromise;

    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, UserId);

    const result = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    const candidateId = result.recordset[0].CandidateID;

    const skillIsRequest = pool.request();

    skillIsRequest.input("SkillID", sql.Int, skillID);

    const skillResult = await skillIsRequest.query(
      `select SkillID from Skills where SkillID=@SkillID`,
    );

    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill Not Found",
      });
    }

    const skillIdResult = skillResult.recordset[0].SkillID;

    const checkCandidateSkillId = pool.request();

    checkCandidateSkillId.input("SkillID", sql.Int, skillIdResult);
    checkCandidateSkillId.input("CandidateID", sql.Int, candidateId);

    const candidateSkillId = await checkCandidateSkillId.query(
      `select CandidateSkillID from CandidateSkills where SkillID=@SkillID and CandidateID=@CandidateID`,
    );

    if (candidateSkillId.recordset.length > 0) {
      return res.status(400).json({
        message: "Skill Already Added",
      });
    }

    const insertSkills = pool.request();

    insertSkills.input("CandidateID", sql.Int, candidateId);
    insertSkills.input("SkillID", sql.Int, skillIdResult);

    await insertSkills.query(
      `insert into CandidateSkills(CandidateID,SkillID)
  values(@CandidateID,@SkillID)`,
    );

    return res.status(201).json({
      message: "Skill Added Successfully",
    });
  } catch (err) {
    console.log("Error in Adding Skills", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE VIEW SKILLS*/

app.get("/candidates/skills", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, userId);
    const result = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "CandidateID Not Found",
      });
    }

    const candidateId = result.recordset[0].CandidateID;

    const skillRequest = pool.request();

    skillRequest.input("CandidateID", sql.Int, candidateId);

    const skillResult = await skillRequest.query(
      `select s.SkillID,s.SkillName from Skills s inner join CandidateSkills c on s.SkillID=c.SkillID where c.CandidateID=@CandidateID`,
    );

    if (skillResult.recordset.length === 0) {
      return res.status(200).json({
        message: "Skill Not Found",
      });
    }

    return res.status(200).json({
      message: "Skill",
      skill: skillResult.recordset,
    });
  } catch (err) {
    console.log("Error in Viewing Skills", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIATE REMOVE SKILLS*/

app.delete("/candidates/skills/:skillId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, userId);
    const result = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "CandidateID Not Found",
      });
    }

    const candidateId = result.recordset[0].CandidateID;

    const skillId = Number(req.params.skillId);

    if (!Number.isInteger(skillId)) {
      return res.status(400).json({
        message: "SkillID should be an Integer",
      });
    }

    const checkSkillRequest = pool.request();

    checkSkillRequest.input("CandidateID", sql.Int, candidateId);
    checkSkillRequest.input("SkillID", sql.Int, skillId);

    const skillResult = await checkSkillRequest.query(
      `select s.SkillID,s.SkillName from Skills s inner join CandidateSkills cs on s.SkillID=cs.SkillID where cs.CandidateID=@CandidateID and cs.SkillID=@SkillID`,
    );

    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate doesnt have this Skill",
      });
    }
    if (skillResult.recordset.length > 0) {
      const deleteSkillRequest = pool.request();

      deleteSkillRequest.input("CandidateID", sql.Int, candidateId);
      deleteSkillRequest.input("SkillID", sql.Int, skillId);

      await deleteSkillRequest.query(
        `DELETE FROM CandidateSkills WHERE CandidateID = @CandidateID AND SkillID = @SkillID`,
      );

      return res.status(200).json({
        message: "Skill Deleted Successfully",
      });
    }
  } catch (err) {
    console.log("Error in Deleteing CandidateSkills", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE VIEW MATCHING SKILLS/JOBS*/

app.get("/jobs/:jobId/matching-skills", authMiddleware, async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId)) {
      return res.status(400).json({
        message: "JobID Should be an Integer",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateRequest = pool.request();

    candidateRequest.input("UserID", sql.Int, userId);

    const result = await candidateRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }
    const candidateId = result.recordset[0].CandidateID;

    const jobCheckRequest = pool.request();
    jobCheckRequest.input("JobID", sql.Int, jobId);

    const jobResult = await jobCheckRequest.query(
      `Select JobID from Jobs where JobID=@JobID`,
    );

    if (jobResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Job Not Found",
      });
    }

    const skillRequest = pool.request();

    skillRequest.input("CandidateID", sql.Int, candidateId);
    skillRequest.input("JobID", sql.Int, jobId);

    const skillResult = await skillRequest.query(
      `select js.SkillID,s.SkillName from JobSkills js inner join CandidateSkills cs on js.SkillID=cs.SkillID inner join Skills s on js.SkillID=s.SkillID where cs.CandidateID=@CandidateID and js.JobID=@JobID`,
    );
    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skills Not Found",
      });
    }

    return res.status(200).json({
      message: "Matching skills",
      Skill: skillResult.recordset,
    });
  } catch (err) {
    console.log("Error in Matching Jobs", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER ADD SKILLS*/

app.post("/jobs/:jobId/skills", authMiddleware, async (req, res) => {
  try {
    const JobId = Number(req.params.jobId);

    if (!Number.isInteger(JobId)) {
      return res.status(400).json({
        message: "JobID Should be an Integer",
      });
    }

    const skillId = Number(req.body.skillId);

    if (!Number.isInteger(skillId)) {
      return res.status(400).json({
        message: "SkillID Should be an Integer",
      });
    }

    const pool = await poolPromise;

    const userId = req.user.userId;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const result = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "RecruiterID Not found ",
      });
    }

    const recruiterID = result.recordset[0].RecruiterID;

    const checkRequest = pool.request();

    checkRequest.input("JobID", sql.Int, JobId);

    const checkResult = await checkRequest.query(
      `select RecruiterID from Jobs where JobID=@JobID`,
    );
    if (checkResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Job Not found ",
      });
    }

    const jobRecruiterId = checkResult.recordset[0].RecruiterID;

    if (recruiterID !== jobRecruiterId) {
      return res.status(403).json({
        message: "Access",
      });
    }

    const skillcheckRequest = pool.request();

    skillcheckRequest.input("SkillID", sql.Int, skillId);

    const skillResult = await skillcheckRequest.query(
      `select SkillID from Skills where SkillID=@SkillID`,
    );

    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill Not Found",
      });
    }

    const checkJobRequest = pool.request();

    checkJobRequest.input("JobID", sql.Int, JobId);
    checkJobRequest.input("SkillID", sql.Int, skillId);

    const JobSkillResult = await checkJobRequest.query(
      `select JobSkillID from JobSkills where JobID=@JobID and SkillID=@SkillID`,
    );

    if (JobSkillResult.recordset.length > 0) {
      return res.status(400).json({
        message: "Already Exists",
      });
    }

    const insertRequest = pool.request();

    insertRequest.input("JobID", sql.Int, JobId);
    insertRequest.input("SkillID", sql.Int, skillId);

    await insertRequest.query(
      `insert into JobSkills(JobID,SkillID)
  values(@JobID,@SkillID)`,
    );
    return res.status(201).json({
      message: "Skill Added to Job Successfully",
    });
  } catch (err) {
    console.log("Error Adding Skills", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER VIEW JOBSKILLS*/

app.get("/jobs/:jobId/skills", authMiddleware, async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId)) {
      return res.status(400).json({
        message: "JobID Should be an Integer",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const result = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "RecruiterID Not found ",
      });
    }

    const recruiterID = result.recordset[0].RecruiterID;

    const checkRecruiterRequest = pool.request();

    checkRecruiterRequest.input("RecruiterID", sql.Int, recruiterID);
    checkRecruiterRequest.input("JobID", sql.Int, jobId);

    const recruiterJobResult = await checkRecruiterRequest.query(
      `select JobID from Jobs where RecruiterID=@RecruiterID and JobID=@JobID`,
    );

    if (recruiterJobResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Access Denied",
      });
    }

    const checkJobRequest = pool.request();

    checkJobRequest.input("JobID", sql.Int, jobId);

    const jobResult = await checkJobRequest.query(
      `Select s.SkillID,s.SkillName from Skills s inner join JobSkills js on s.SkillID=js.SkillID where js.JobID=@JobID`,
    );

    if (jobResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill Not Found",
      });
    }

    return res.status(200).json({
      message: "Skills ",
      skill: jobResult.recordset,
    });
  } catch (err) {
    console.log("Error in Viewing Skills", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER REMOVE JOB SKILLS*/

app.delete("/jobs/:jobId/skills/:skillId", authMiddleware, async (req, res) => {
  try {
    const jobId = Number(req.params.jobId);

    const skillId = Number(req.params.skillId);

    if (!Number.isInteger(jobId)) {
      return res.status(400).json({
        message: "jobID Should be an Integer",
      });
    }
    if (!Number.isInteger(skillId)) {
      return res.status(400).json({
        message: "SkillID Should be an Integer",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const result = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }
    const recruiterId = result.recordset[0].RecruiterID;

    const jobRequest = pool.request();

    jobRequest.input("JobID", sql.Int, jobId);
    jobRequest.input("RecruiterID", sql.Int, recruiterId);

    const jobResult = await jobRequest.query(
      `select JobID from Jobs where RecruiterID=@RecruiterID and JobID=@JobID`,
    );

    if (jobResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Job Not Found",
      });
    }

    const jobSkillRequest = pool.request();

    jobSkillRequest.input("JobID", sql.Int, jobId);
    jobSkillRequest.input("SkillID", sql.Int, skillId);

    const jobSkillResult = await jobSkillRequest.query(
      `select JobSkillID from JobSkills where JobID=@JobID and SkillID=@SkillID`,
    );

    if (jobSkillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "JobSkill Not Found",
      });
    }

    const deleteRequest = pool.request();

    deleteRequest.input("JobID", sql.Int, jobId);
    deleteRequest.input("SkillID", sql.Int, skillId);

    const deleteResult = await deleteRequest.query(
      `Delete from JobSkills where JobID=@JobID and SkillID=@SkillID`,
    );

    if (deleteResult.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "JobSkill Doesnt Exists",
      });
    }
    return res.status(200).json({
      message: "JobSkill Deleted Successfully",
    });
  } catch (err) {
    console.log("Error in Deleting JobSkills", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER FIND CANDIDATES BY SKILLS*/

app.get("/candidates/skills/:skillId", authMiddleware, async (req, res) => {
  try {
    const skillId = Number(req.params.skillId);

    if (!Number.isInteger(skillId)) {
      return res.status(400).json({
        message: "SkillID Should be an Integer",
      });
    }

    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterIdRequest = pool.request();

    recruiterIdRequest.input("UserID", sql.Int, userId);

    const result = await recruiterIdRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const checkSkillRequest = pool.request();

    checkSkillRequest.input("SkillID", sql.Int, skillId);

    const skillResult = await checkSkillRequest.query(
      `select SkillID from Skills where SkillID=@SkillID`,
    );

    if (skillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Skill Not Found",
      });
    }

    const matchingResult = await pool
      .request()
      .input("SkillID", sql.Int, skillId)
      .query(
        `select s.Name,s.Email,c.Phone,c.Location,c.ResumePath,c.CandidateID from Candidates c inner join CandidateSkills cs on c.CandidateID=cs.CandidateID inner join Users s on c.UserID=s.UserID where cs.SkillID=@SkillID`,
      );

    if (matchingResult.recordset.length === 0) {
      return res.status(404).json({
        message: "No Matching Result",
      });
    }

    return res.status(200).json({
      message: "Matching Results",
      matchingResult: matchingResult.recordset,
    });
  } catch (err) {
    console.log("Error in Searching Candidates", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER FIND CANDIDATES BY JOBS SKILLS*/

app.get(
  "/jobs/:jobId/matching-candidates",
  authMiddleware,
  async (req, res) => {
    try {
      const jobId = Number(req.params.jobId);

      if (!Number.isInteger(jobId)) {
        return res.status(400).json({
          message: "JobID Should be an Integer",
        });
      }

      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }
      const userId = req.user.userId;

      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();

      recruiterIdRequest.input("UserID", sql.Int, userId);

      const result = await recruiterIdRequest.query(
        `select RecruiterID from Recruiters where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterId = result.recordset[0].RecruiterID;

      const jobRequest = pool.request();
      jobRequest.input("RecruiterID", sql.Int, recruiterId);
      jobRequest.input("JobID", sql.Int, jobId);

      const jobResult = await jobRequest.query(
        `Select JobID from Jobs where RecruiterID=@RecruiterID and JobID=@JobID`,
      );

      if (jobResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Job Not Found",
        });
      }

      const matchingResult = await pool
        .request()
        .input("JobID", sql.Int, jobId)
        .query(
          `select distinct u.Name,u.Email,c.Phone,c.Location,c.CandidateID from CandidateSkills cs inner join JobSkills js on cs.SkillID=js.SkillID inner join Candidates c on cs.CandidateID=c.CandidateID inner join Users u on u.UserID=c.UserID where js.JobID=@JobID`,
        );

      if (matchingResult.recordset.length === 0) {
        return res.status(200).json({
          message: "No Candidates Found",
          matchingResult: [],
        });
      }

      return res.status(200).json({
        message: "Matching Result",
        matchingResult: matchingResult.recordset,
      });
    } catch (err) {
      console.log("Error in Finding Candidates by Job Skills");
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*CANDIDATE FIND MATCHING JOBS BY SKILLS*/

app.get("/jobs/matching-skills", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }
    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, userId);

    const result = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    const candidateId = result.recordset[0].CandidateID;

    const matchSkillsRequest = pool.request();

    matchSkillsRequest.input("CandidateID", sql.Int, candidateId);

    const matchSkillResult = await matchSkillsRequest.query(
      `Select distinct j.JobID,j.JobTitle,j.Location,j.SalaryMin,j.SalaryMax,j.ExperienceRequired,j.JobType from CandidateSkills cs inner join JobSkills js on cs.SkillID=js.SkillID inner join Jobs j on js.JobID=j.JobID where cs.CandidateID=@CandidateID`,
    );

    if (matchSkillResult.recordset.length === 0) {
      return res.status(404).json({
        message: "No Matching Results",
      });
    }

    return res.status(200).json({
      message: "Matching Results",
      matchSkillResult: matchSkillResult.recordset,
    });
  } catch (err) {
    console.log("Error in Search Matching ", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*ADVANCED FEATURE1 CANDIDATE MATCH SCORE*/

app.get(
  "/jobs/:jobId/candidate-match/:candidateId",
  authMiddleware,
  async (req, res) => {
    try {
      const jobId = Number(req.params.jobId);
      const candidateId = Number(req.params.candidateId);

      if (!Number.isInteger(jobId)) {
        return res.status(400).json({
          message: "JobID Should be an Integer",
        });
      }
      if (!Number.isInteger(candidateId)) {
        return res.status(400).json({
          message: "CandidateID Should be an Integer",
        });
      }

      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;

      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();

      recruiterIdRequest.input("UserID", sql.Int, userId);

      const result = await recruiterIdRequest.query(
        `select RecruiterID from Recruiters where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterId = result.recordset[0].RecruiterID;

      const jobsOwnRequest = pool.request();

      jobsOwnRequest.input("RecruiterID", sql.Int, recruiterId);
      jobsOwnRequest.input("JobID", sql.Int, jobId);

      const jobOwnResult = await jobsOwnRequest.query(
        `select JobID from Jobs where RecruiterID=@RecruiterID and JobID=@JobID`,
      );

      if (jobOwnResult.recordset.length === 0) {
        return res.status(404).json({
          message: "No Jobs Owned By Reccruiter",
        });
      }

      const checkCandidateRequest = pool.request();

      checkCandidateRequest.input("CandidateID", sql.Int, candidateId);

      const checkCandidateResult = await checkCandidateRequest.query(
        `select CandidateID from Candidates where CandidateID=@CandidateID`,
      );

      if (checkCandidateResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Candidate Not Found",
        });
      }

      const totalJobSkillsRequest = pool.request();

      totalJobSkillsRequest.input("JobID", sql.Int, jobId);

      const totalJobSkillsResult = await totalJobSkillsRequest.query(
        `select count(*) as TotalJobSkills from JobSkills where JobID=@JobID`,
      );

      if (totalJobSkillsResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Job Skills Not Found",
        });
      }

      const totalJobSkills = totalJobSkillsResult.recordset[0].TotalJobSkills;

      const countMatchingSkillsRequest = pool.request();

      countMatchingSkillsRequest.input("JobID", sql.Int, jobId);
      countMatchingSkillsRequest.input("CandidateID", sql.Int, candidateId);

      const matchingSkillsResult = await countMatchingSkillsRequest.query(
        `select count(*) as MatchingSkills from CandidateSkills cs inner join JobSkills js on cs.SkillID=js.SkillID where cs.CandidateID=@CandidateID and js.JobID=@JobID`,
      );
      const matchingSkills = matchingSkillsResult.recordset[0].MatchingSkills;

      if (totalJobSkills === 0) {
        return res.status(404).json({
          message: "Total JobSkills is 0",
        });
      }

      const matchPercentage = Number(matchingSkills / totalJobSkills) * 100;

      const matchResult = matchPercentage.toFixed(2);

      const matchPercentResult = Number(matchResult);

      return res.status(200).json({
        message: "Matching Precentage",
        totalJobSkills: totalJobSkills,
        matchingSkills: matchingSkills,
        matchPercenttage: matchPercentResult,
      });
    } catch (err) {
      console.log("Error in Matching Percentage", err);
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*ADVANCED FEATURE2 RECRUITER FILTER CANDIDATE*/

app.get("/candidates/search", authMiddleware, async (req, res) => {
  try {
    const skills = req.query.skills;
    const location = req.query.location;

    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }
    const conditions = [];

    const pool = await poolPromise;
    const request = pool.request();

    if (skills) {
      conditions.push("s.SkillName=@Skills");
    }
    if (skills) {
      request.input("Skills", sql.VarChar, skills);
    }

    if (location) {
      conditions.push("Location=@Location");
    }
    if (location) {
      request.input("Location", sql.VarChar, location);
    }

    const whereClause = conditions.length
      ? " WHERE " + conditions.join(" AND ")
      : "";

    const filtercandidateResult = await request.query(
      `Select distinct c.CandidateID,u.Name,s.SkillName,u.Email,c.Location,c.Phone from Candidates c inner join Users u on c.UserID=u.UserID inner join CandidateSkills cs on c.CandidateID=cs.CandidateID inner join Skills s on cs.SkillID=s.SkillID ${whereClause} `,
    );

    if (filtercandidateResult.recordset.length === 0) {
      return res.status(404).json({
        message: "No Result Found",
      });
    }

    return res.status(200).json({
      message: "Results",
      result: filtercandidateResult.recordset,
    });
  } catch (err) {
    console.log("Error in Filtering Candidate by Match Percentage");
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER VIEWING SINGLE CANDIDATE DETAILS*/

app.get("/candidate/:candidateId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const candidateId = Number(req.params.candidateId);

    if (!Number.isInteger(candidateId)) {
      return res.status(404).json({
        message: "CandidateID Should be an Integer",
      });
    }
    const pool = await poolPromise;

    const checkCandidateRequest = pool.request();
    checkCandidateRequest.input("CandidateID", sql.Int, candidateId);

    const candidateResult = await checkCandidateRequest.query(
      `select c.CandidateID,u.Name,u.Email,c.Phone,c.Location,c.ResumePath,s.SkillName from Candidates c inner join Users u on u.UserID=c.UserID inner join CandidateSkills cs on cs.CandidateID=c.CandidateID inner join Skills s on s.SkillID=cs.SkillID where c.CandidateID=@CandidateID`,
    );

    if (candidateResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    return res.status(200).json({
      message: "Candidate Details",
      candidateResult: candidateResult.recordset,
    });
  } catch (err) {
    console.log("Error in Viewing Single Candidate", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*GET A SINGLE JOB*/

app.get("/jobs/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }
    const jobid = Number(req.params.id);

    if (isNaN(jobid)) {
      return res.status(400).json({
        message: "JobID should be an Integer",
      });
    }
    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const result = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterId = result.recordset[0].RecruiterID;

    const jobIdrequest = pool.request();

    jobIdrequest.input("JobID", sql.Int, jobid);
    jobIdrequest.input("RecruiterID", sql.Int, recruiterId);

    const jobIdResult = await jobIdrequest.query(
      `SELECT
    JobID,
    JobTitle,
    Description,
    Location,
    SalaryMin,
    SalaryMax,
    ExperienceRequired,
    JobType,
    SkillsRequired
FROM Jobs
WHERE JobID = @JobID AND RecruiterID = @RecruiterID;`,
    );

    if (jobIdResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Job Not Found",
      });
    }

    return res.status(200).json({
      JobIDResult: jobIdResult.recordset,
    });
  } catch (err) {
    console.log("JobIDRequest Error:", err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER SHORTLIST CANDIDATE*/

app.post(
  "/jobs/:jobId/candidate/:candidateId/shortlist",
  authMiddleware,
  async (req, res) => {
    try {
      const jobId = Number(req.params.jobId);
      const candidateId = Number(req.params.candidateId);

      if (!Number.isInteger(jobId) || jobId <= 0) {
        return res.status(400).json({
          message: "JobID must be a positive integer",
        });
      }

      if (!Number.isInteger(candidateId) || candidateId <= 0) {
        return res.status(400).json({
          message: "CandidateID must be a positive integer",
        });
      }

      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;
      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();
      recruiterIdRequest.input("UserID", sql.Int, userId);

      const recruiterResult = await recruiterIdRequest.query(
        `SELECT RecruiterID
         FROM Recruiters
         WHERE UserID = @UserID`,
      );

      if (recruiterResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterID = recruiterResult.recordset[0].RecruiterID;

      const jobOwnRequest = pool.request();
      jobOwnRequest.input("RecruiterID", sql.Int, recruiterID);
      jobOwnRequest.input("JobID", sql.Int, jobId);

      const jobOwnResult = await jobOwnRequest.query(
        `SELECT JobID
         FROM Jobs
         WHERE RecruiterID = @RecruiterID
         AND JobID = @JobID`,
      );

      if (jobOwnResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Job Not Found or Not Owned By Recruiter",
        });
      }

      const applicationRequest = pool.request();
      applicationRequest.input("JobID", sql.Int, jobId);
      applicationRequest.input("CandidateID", sql.Int, candidateId);

      const applicationResult = await applicationRequest.query(
        `SELECT ApplicationID, Status
         FROM Applications
         WHERE JobID = @JobID
         AND CandidateID = @CandidateID`,
      );

      if (applicationResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Application Not Found",
        });
      }

      const application = applicationResult.recordset[0];
      const applicationId = application.ApplicationID;

      if (application.Status === "Rejected") {
        return res.status(409).json({
          message: "Candidate Rejected",
        });
      }

      if (application.Status === "Shortlisted") {
        return res.status(409).json({
          message: "Candidate Already Shortlisted",
        });
      }

      if (application.Status !== "Applied") {
        return res.status(409).json({
          message: "Cannot shortlist candidate with current application status",
        });
      }

      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();

        const changeStatusRequest = new sql.Request(transaction);

        changeStatusRequest.input("JobID", sql.Int, jobId);
        changeStatusRequest.input("CandidateID", sql.Int, candidateId);
        changeStatusRequest.input("Status", sql.VarChar, "Shortlisted");

        await changeStatusRequest.query(
          `UPDATE Applications
           SET Status = @Status
           WHERE CandidateID = @CandidateID
           AND JobID = @JobID`,
        );

        const historyRequest = new sql.Request(transaction);

        historyRequest.input("ApplicationID", sql.Int, applicationId);
        historyRequest.input("Status", sql.VarChar, "Shortlisted");

        await historyRequest.query(
          `INSERT INTO ApplicationStatusHistory
           (ApplicationID, Status)
           VALUES (@ApplicationID, @Status)`,
        );

        await transaction.commit();

        return res.status(200).json({
          message: "Candidate Shortlisted",
        });
      } catch (error) {
        await transaction.rollback();
        console.error(error);

        return res.status(500).json({
          message: "Failed to shortlist candidate",
        });
      }
    } catch (err) {
      console.error("Error in Shortlisting Candidate", err);

      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*RECRUITER REJECT CANDIDATE*/

app.post(
  "/jobs/:jobId/candidate/:candidateId/reject",
  authMiddleware,
  async (req, res) => {
    try {
      const jobId = Number(req.params.jobId);
      const candidateId = Number(req.params.candidateId);

      if (!Number.isInteger(jobId) || jobId <= 0) {
        return res.status(400).json({
          message: "JobID must be a positive integer",
        });
      }

      if (!Number.isInteger(candidateId) || candidateId <= 0) {
        return res.status(400).json({
          message: "CandidateID must be a positive integer",
        });
      }

      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;
      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();
      recruiterIdRequest.input("UserID", sql.Int, userId);

      const recruiterResult = await recruiterIdRequest.query(
        `SELECT RecruiterID
         FROM Recruiters
         WHERE UserID = @UserID`,
      );

      if (recruiterResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterID = recruiterResult.recordset[0].RecruiterID;

      const jobOwnRequest = pool.request();
      jobOwnRequest.input("RecruiterID", sql.Int, recruiterID);
      jobOwnRequest.input("JobID", sql.Int, jobId);

      const jobOwnResult = await jobOwnRequest.query(
        `SELECT JobID
         FROM Jobs
         WHERE RecruiterID = @RecruiterID
         AND JobID = @JobID`,
      );

      if (jobOwnResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Job Not Found or Not Owned By Recruiter",
        });
      }

      const applicationRequest = pool.request();
      applicationRequest.input("JobID", sql.Int, jobId);
      applicationRequest.input("CandidateID", sql.Int, candidateId);

      const applicationResult = await applicationRequest.query(
        `SELECT ApplicationID, Status
         FROM Applications
         WHERE JobID = @JobID
         AND CandidateID = @CandidateID`,
      );

      if (applicationResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Application Not Found",
        });
      }

      const application = applicationResult.recordset[0];
      const applicationId = application.ApplicationID;

      if (application.Status === "Rejected") {
        return res.status(409).json({
          message: "Candidate Already Rejected",
        });
      }

      if (application.Status === "Shortlisted") {
        return res.status(409).json({
          message: "Cannot Reject Because Candidate Is Already Shortlisted",
        });
      }

      if (application.Status !== "Applied") {
        return res.status(409).json({
          message: "Cannot reject candidate with current application status",
        });
      }

      const transaction = new sql.Transaction(pool);

      try {
        await transaction.begin();

        const changeStatusRequest = new sql.Request(transaction);

        changeStatusRequest.input("JobID", sql.Int, jobId);
        changeStatusRequest.input("CandidateID", sql.Int, candidateId);
        changeStatusRequest.input("Status", sql.VarChar, "Rejected");

        await changeStatusRequest.query(
          `UPDATE Applications
           SET Status = @Status
           WHERE CandidateID = @CandidateID
           AND JobID = @JobID`,
        );

        const historyRequest = new sql.Request(transaction);

        historyRequest.input("ApplicationID", sql.Int, applicationId);
        historyRequest.input("Status", sql.VarChar, "Rejected");

        await historyRequest.query(
          `INSERT INTO ApplicationStatusHistory
           (ApplicationID, Status)
           VALUES (@ApplicationID, @Status)`,
        );

        await transaction.commit();

        return res.status(200).json({
          message: "Candidate Rejected",
        });
      } catch (error) {
        await transaction.rollback();
        console.error(error);

        return res.status(500).json({
          message: "Failed to reject candidate",
        });
      }
    } catch (err) {
      console.error("Error in Rejecting Candidate", err);

      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*CANDIDATE VIEW APPLICATION HISTORY*/

app.get(
  "/applications/:applicationId/history",
  authMiddleware,
  async (req, res) => {
    try {
      const applicationId = Number(req.params.applicationId);

      if (!Number.isInteger(applicationId)) {
        return res.status(400).json({
          message: "Application Shoul be an Integer",
        });
      }

      if (req.user.role !== "Candidate") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;

      const pool = await poolPromise;

      const candidateIdRequest = pool.request();

      candidateIdRequest.input("UserID", sql.Int, userId);

      const result = await candidateIdRequest.query(
        `Select CandidateID from Candidates where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Candidate Not Found",
        });
      }

      const candidateId = result.recordset[0].CandidateID;

      const applicationRequest = pool.request();

      applicationRequest.input("ApplicationID", sql.Int, applicationId);

      const applicationResult = await applicationRequest.query(
        `select ApplicationID from Applications where ApplicationID=@ApplicationID`,
      );

      if (applicationResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Application Not Found",
        });
      }

      const applicationStatusRequest = pool.request();

      applicationStatusRequest.input("CandidateID", sql.Int, candidateId);
      applicationStatusRequest.input("ApplicationID", sql.Int, applicationId);

      const applicationStatusResult = await applicationStatusRequest.query(
        `Select ash.Status,ash.ChangedAt from ApplicationStatusHistory ash inner join Applications a on ash.ApplicationID=a.ApplicationID where a.CandidateID=@CandidateID and ash.ApplicationID=@ApplicationID order by ChangedAt ASC`,
      );

      if (applicationStatusResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Applications Does Not Belongs to Candidate ",
        });
      }

      return res.status(200).json({
        message: "Result",
        applicationStatusResult: applicationStatusResult.recordset,
      });
    } catch (err) {
      console.log("Error in Viewing Application History");
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*RECRUITER VIEWING APPLICATION STATUS HISTORY*/

app.get(
  "/recruiter/application/:applicationId/history",
  authMiddleware,
  async (req, res) => {
    try {
      const applicationId = Number(req.params.applicationId);

      if (!Number.isInteger(applicationId)) {
        return res.status(400).json({
          message: "Application Should be an Integer",
        });
      }

      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;

      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();

      recruiterIdRequest.input("UserID", sql.Int, userId);

      const result = await recruiterIdRequest.query(
        `Select RecruiterID from Recruiters where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterId = result.recordset[0].RecruiterID;

      const jobIdRequest = pool.request();
      jobIdRequest.input("ApplicationID", sql.Int, applicationId);

      const jobIdResult = await jobIdRequest.query(
        `Select JobID from Applications where ApplicationID=@ApplicationID`,
      );

      if (jobIdResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Application Not Found",
        });
      }

      const applicationStatusRequest = pool.request();

      applicationStatusRequest.input("RecruiterID", sql.Int, recruiterId);
      applicationStatusRequest.input("ApplicationID", sql.Int, applicationId);

      const applicationStatusResult = await applicationStatusRequest.query(
        `Select ash.Status,ash.ChangedAt from ApplicationStatusHistory ash inner join Applications a on ash.ApplicationID=a.ApplicationID inner join Jobs j on a.JobID=j.JobID where a.ApplicationID=@ApplicationID and j.RecruiterID=@RecruiterID order by ChangedAt ASC`,
      );

      if (applicationStatusResult.recordset.length === 0) {
        return res.status(404).json({
          message: "Applications Does Not Belongs to Recruiter ",
        });
      }

      return res.status(200).json({
        message: "Result",
        applicationStatusResult: applicationStatusResult.recordset,
      });
    } catch (err) {
      console.log("Error in Viewing Application History", err);
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*RECRUITER UPDATE EXISTING JOB*/

app.put("/jobs/:id", authMiddleware, async (req, res) => {
  try {
    const jobId = Number(req.params.id);

    const userId = req.user.userId;

    const pool = await poolPromise;

    const checkRequest = pool.request();
    checkRequest.input("JobID", sql.Int, jobId);
    checkRequest.input("UserID", sql.Int, userId);

    const result = await checkRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    const recruiterId = result.recordset[0].RecruiterID;

    const checkRecruiterIdRequest = pool.request();

    checkRecruiterIdRequest.input("RecruiterID", sql.Int, recruiterId);
    checkRecruiterIdRequest.input("JobID", sql.Int, jobId);

    const checkJobIdResult = await checkRecruiterIdRequest.query(
      `select JobID from Jobs where JobID=@JobID and RecruiterID=@RecruiterID`,
    );

    console.log("UserID", userId);
    console.log("RecruiterID", recruiterId);
    console.log("JobID", jobId);
    console.log("Ownership Result:", checkJobIdResult.recordset);

    if (checkJobIdResult.recordset.length === 0) {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const {
      jobTitle,
      description,
      location,
      salaryMin,
      salaryMax,
      experienceRequired,
      jobType,
      skillsRequired,
    } = req.body;

    if (
      !jobTitle ||
      !description ||
      !location ||
      experienceRequired === undefined ||
      experienceRequired === null ||
      !jobType ||
      !skillsRequired
    ) {
      return res.status(400).json({
        message: "Invalid Data",
      });
    }

    if (
      salaryMin === undefined ||
      salaryMin === null ||
      salaryMax === undefined ||
      salaryMax === null
    ) {
      return res.status(400).json({
        message: "Salary is Required",
      });
    }

    if (isNaN(salaryMin) || isNaN(salaryMax) || isNaN(experienceRequired)) {
      return res.status(400).json({
        message: "Salary and Experience Must be a Number",
      });
    }

    if (salaryMin < 0 || salaryMax < 0) {
      return res.status(400).json({
        message: "Salary Cannot be Negative",
      });
    }

    if (salaryMin > salaryMax) {
      return res.status(400).json({
        message: "Invalid Salary Range",
      });
    }
    if (
      jobType !== "Full-time" &&
      jobType !== "Part-time" &&
      jobType !== "Internship"
    ) {
      return res.status(400).json({
        message: "Invalid JobType",
      });
    }

    if (experienceRequired < 0) {
      return res.status(400).json({
        message: "Experience Cannot be Negative",
      });
    }

    const updateJobRequest = pool.request();
    updateJobRequest.input("JobID", sql.Int, jobId);
    updateJobRequest.input("RecruiterID", sql.Int, recruiterId);
    updateJobRequest.input("JobTitle", sql.VarChar, jobTitle);
    updateJobRequest.input("Description", sql.VarChar, description);
    updateJobRequest.input("Location", sql.VarChar, location);
    updateJobRequest.input("SalaryMin", sql.Int, salaryMin);
    updateJobRequest.input("SalaryMax", sql.Int, salaryMax);
    updateJobRequest.input("ExperienceRequired", sql.Int, experienceRequired);
    updateJobRequest.input("JobType", sql.VarChar, jobType);
    updateJobRequest.input("SkillsRequired", sql.VarChar, skillsRequired);

    const updateJobResult = await updateJobRequest.query(
      `update Jobs set JobTitle=@JobTitle,Description=@Description,Location=@Location,SalaryMin=@SalaryMin,SalaryMax=@SalaryMax,ExperienceRequired=@ExperienceRequired,JobType=@JobType,SkillsRequired=@SkillsRequired where JobId=@JobID and RecruiterID=@RecruiterID`,
    );

    if (updateJobResult.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "Job Not Found",
      });
    }

    return res.status(200).json({
      message: "Job Update Successfully",
    });
  } catch (err) {
    console.log("Error in Updating Job:", err);
    res.status(500).json({
      message: "Server Error",
    });
  }
});

/*DELETE JOBS*/

app.delete("/deleteJob/:id", authMiddleware, async (req, res) => {
  try {
    const jobId = Number(req.params.id);

    if (isNaN(jobId)) {
      return res.status(400).json({
        message: "Invalid Job ID",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const checkRequest = pool.request();

    checkRequest.input("UserID", sql.Int, userId);

    const result = await checkRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    const recruiterId = result.recordset[0].RecruiterID;

    const checkDelRequest = pool.request();

    checkDelRequest.input("RecruiterID", sql.Int, recruiterId);
    checkDelRequest.input("JobID", sql.Int, jobId);

    const checkJobId = await checkDelRequest.query(
      `select JobID from Jobs where JobID=@JobID and RecruiterID=@RecruiterID`,
    );

    if (checkJobId.recordset.length === 0) {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const jobDeleteRequest = pool.request();

    jobDeleteRequest.input("JobID", sql.Int, jobId);
    jobDeleteRequest.input("RecruiterID", sql.Int, recruiterId);

    await jobDeleteRequest.query(
      `Delete from Jobs where JobID=@JobID and RecruiterID=@RecruiterID`,
    );

    return res.status(200).json({
      message: "Job Deleted Successfully",
    });
  } catch (err) {
    console.log("Error in Delete Jobs", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE APPLYING JOB*/

app.post("/applications", authMiddleware, async (req, res) => {
  let transaction;
  let transactionStarted = false;

  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const { jobId } = req.body;
    console.log("Request Body:", req.body);
    console.log("Job ID:", jobId);
    const parsedJobId = Number(jobId);

    if (
      jobId === undefined ||
      jobId === null ||
      jobId === "" ||
      !Number.isInteger(parsedJobId) ||
      parsedJobId <= 0
    ) {
      return res.status(400).json({
        message: "Invalid JobID",
      });
    }

    const userId = req.user.userId;
    const pool = await poolPromise;

    const candidateRequest = pool.request();
    candidateRequest.input("UserID", sql.Int, userId);

    const candidateResult = await candidateRequest.query(
      `SELECT CandidateID FROM Candidates WHERE UserID = @UserID`,
    );

    if (candidateResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }

    const candidateId = candidateResult.recordset[0].CandidateID;

    const duplicateRequest = pool.request();
    duplicateRequest.input("JobID", sql.Int, parsedJobId);
    duplicateRequest.input("CandidateID", sql.Int, candidateId);

    const duplicateResult = await duplicateRequest.query(
      `SELECT ApplicationID FROM Applications
       WHERE JobID = @JobID AND CandidateID = @CandidateID`,
    );

    if (duplicateResult.recordset.length > 0) {
      return res.status(409).json({
        message: "Already Applied",
      });
    }

    const checkJobRequest = pool.request();
    checkJobRequest.input("JobID", sql.Int, parsedJobId);

    const jobResult = await checkJobRequest.query(
      `SELECT JobID FROM Jobs WHERE JobID = @JobID`,
    );

    if (jobResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Job Not Found",
      });
    }

    transaction = new sql.Transaction(pool);
    await transaction.begin();
    transactionStarted = true;

    const applicationDate = new Date();
    const status = "Applied";
    const updatedAt = new Date();

    const insertJobRequest = new sql.Request(transaction);

    insertJobRequest.input("JobID", sql.Int, parsedJobId);
    insertJobRequest.input("CandidateID", sql.Int, candidateId);
    insertJobRequest.input("ApplicationDate", sql.DateTime2, applicationDate);
    insertJobRequest.input("Status", sql.VarChar, status);
    insertJobRequest.input("UpdatedAt", sql.DateTime2, updatedAt);

    const insertResult = await insertJobRequest.query(
      `INSERT INTO Applications
       (JobID, CandidateID, ApplicationDate, Status, UpdatedAt)
       OUTPUT INSERTED.ApplicationID
       VALUES
       (@JobID, @CandidateID, @ApplicationDate, @Status, @UpdatedAt)`,
    );

    const applicationId = insertResult.recordset[0].ApplicationID;

    const historyRequest = new sql.Request(transaction);

    historyRequest.input("ApplicationID", sql.Int, applicationId);
    historyRequest.input("Status", sql.VarChar, status);

    await historyRequest.query(
      `INSERT INTO ApplicationStatusHistory
       (ApplicationID, Status)
       VALUES
       (@ApplicationID, @Status)`,
    );

    await transaction.commit();
    transactionStarted = false;

    return res.status(201).json({
      message: "Application Created Successfully",
      applicationId: applicationId,
      status: status,
    });
  } catch (err) {
    if (transaction && transactionStarted) {
      try {
        await transaction.rollback();
        transactionStarted = false;
      } catch (rollbackError) {
        console.log("Rollback Error:", rollbackError);
      }
    }

    console.log("Error in Apply Job", err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE CHECKING APPLICATION*/

app.get("/applications/my", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateRequest = pool.request();

    candidateRequest.input("UserID", sql.Int, userId);

    const Result = await candidateRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );
    if (Result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not found",
      });
    }

    const candidateIdResult = Result.recordset[0].CandidateID;

    const applicationRequest = pool.request();
    applicationRequest.input("CandidateID", sql.Int, candidateIdResult);

    const applicationResult = await applicationRequest.query(
      `select ApplicationID,ApplicationDate,Status,UpdatedAt,j.JobID,JobTitle,Location,SalaryMin,SalaryMax,JobType,ExperienceRequired from Applications a INNER JOIN Jobs j on a.JobID =j.JobID where a.CandidateID=@CandidateID`,
    );

    if (applicationResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Application Not Found",
      });
    }
    return res.status(200).json({
      message: "Applications Retrieved Successfully",
      application: applicationResult.recordset,
    });
  } catch (err) {
    console.log("Error in Viewing Application ", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER CHECKING APPLICATIONS*/

app.get("/applications/recruiter", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }
    const userId = req.user.userId;
    const pool = await poolPromise;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const Result = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (Result.recordset.length === 0) {
      return res.status(404).json({
        message: "RecruiterId Not Found",
      });
    }
    const recruiterIdResult = Result.recordset[0].RecruiterID;

    const jobRequest = pool.request();

    jobRequest.input("RecruiterID", sql.Int, recruiterIdResult);

    const jobResult = await jobRequest.query(
      `select ApplicationID,ApplicationDate,Status,UpdatedAt,a.JobID,JobTitle,a.CandidateID,c.ResumePath,Name,Email,Phone from Applications a inner join Jobs j on a.JobID=j.JobID inner join Candidates c on a.CandidateID=c.CandidateID inner join Users u on c.UserID=u.UserID where j.RecruiterID=@RecruiterID order by applicationDate DESC`,
    );

    if (jobResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Applications Not Found",
      });
    }

    const recruiterJobResult = jobResult.recordset;
    return res.status(200).json({
      message: "applications Retrieved Successfully",
      RecruiterJobResult: recruiterJobResult,
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Server error ",
    });
  }
});

/*RECRUITER UPDATING STATUS OF APPLICATIONS*/

app.put("/applications/:id/status", authMiddleware, async (req, res) => {
  try {
    const applicationId = Number(req.params.id);

    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }
    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const result = await recruiterRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterId = result.recordset[0].RecruiterID;

    const applicationRequest = pool.request();

    applicationRequest.input("ApplicationID", sql.Int, applicationId);

    const applicationDetailResult = await applicationRequest.query(
      `select a.JobId,j.RecruiterID from Applications a inner join Jobs j on a.JobID=j.JobID where a.ApplicationID=@ApplicationID`,
    );

    if (applicationDetailResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Application Not found",
      });
    }

    const jobRecruiterID = applicationDetailResult.recordset[0].RecruiterID;

    if (recruiterId !== jobRecruiterID) {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const { status } = req.body;

    const validStatus = ["Applied", "Shortlisted", "Rejected"];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid Status",
      });
    }

    const updateAppRequest = pool.request();

    updateAppRequest.input("Status", sql.VarChar, status);
    updateAppRequest.input("ApplicationID", sql.Int, applicationId);
    await updateAppRequest.query(
      `update Applications set Status=@Status,UpdatedAt=GETDATE() where ApplicationID=@ApplicationID`,
    );

    return res.status(200).json({
      message: "Application Status Update Successfully",
    });
  } catch (err) {
    console.log("Application Status Error", err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER POSTING INTERVIEW DETAILS*/

app.post("/interviews", authMiddleware, async (req, res) => {
  let transaction;

  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const {
      applicationId,
      interviewDate,
      interviewMode,
      interviewLocation,
      notes,
    } = req.body;

    if (!applicationId || !interviewDate || !interviewMode) {
      return res.status(400).json({
        message: "Incomplete Data",
      });
    }

    const validModes = ["Online", "Offline"];

    if (!validModes.includes(interviewMode)) {
      return res.status(400).json({
        message: "Invalid Interview Mode",
      });
    }

    if (interviewMode === "Offline" && !interviewLocation) {
      return res.status(400).json({
        message: "Incomplete Interview Location",
      });
    }

    const parsedInterviewDate = new Date(interviewDate);

    if (Number.isNaN(parsedInterviewDate.getTime())) {
      return res.status(400).json({
        message: "Invalid Interview Date",
      });
    }

    const pool = await poolPromise;

    const recruiterRequest = pool.request();

    recruiterRequest.input("UserID", sql.Int, userId);

    const recruiterResult = await recruiterRequest.query(`
      SELECT RecruiterID
      FROM Recruiters
      WHERE UserID = @UserID
    `);

    if (recruiterResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterID = recruiterResult.recordset[0].RecruiterID;

    const applicationRequest = pool.request();

    applicationRequest.input("ApplicationID", sql.Int, applicationId);

    const applicationResult = await applicationRequest.query(`
      SELECT
        a.ApplicationID,
        a.JobID,
        j.RecruiterID
      FROM Applications a
      INNER JOIN Jobs j
        ON a.JobID = j.JobID
      WHERE a.ApplicationID = @ApplicationID
    `);

    if (applicationResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Application Not Found",
      });
    }

    const jobRecruiterID = applicationResult.recordset[0].RecruiterID;

    if (recruiterID !== jobRecruiterID) {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    transaction = new sql.Transaction(pool);

    await transaction.begin();

    const interviewRequest = new sql.Request(transaction);

    interviewRequest.input("ApplicationID", sql.Int, applicationId);
    interviewRequest.input("InterviewDate", sql.DateTime, parsedInterviewDate);
    interviewRequest.input("InterviewMode", sql.VarChar, interviewMode);
    interviewRequest.input(
      "InterviewLocation",
      sql.VarChar,
      interviewLocation || null,
    );
    interviewRequest.input("Status", sql.VarChar, "Scheduled");
    interviewRequest.input("Notes", sql.VarChar, notes || null);

    const interviewResult = await interviewRequest.query(`
      INSERT INTO Interviews (
        ApplicationID,
        InterviewDate,
        InterviewMode,
        InterviewLocation,
        Status,
        Notes,
        CreatedAt
      )
      OUTPUT INSERTED.InterviewID
      VALUES (
        @ApplicationID,
        @InterviewDate,
        @InterviewMode,
        @InterviewLocation,
        @Status,
        @Notes,
        GETDATE()
      )
    `);

    const interviewID = interviewResult.recordset[0].InterviewID;

    const statusRequest = new sql.Request(transaction);

    statusRequest.input("ApplicationID", sql.Int, applicationId);
    statusRequest.input("Status", sql.VarChar, "Scheduled");

    const statusResult = await statusRequest.query(`
      UPDATE Applications
      SET
        Status = @Status,
        UpdatedAt = GETDATE()
      WHERE ApplicationID = @ApplicationID
    `);

    if (statusResult.rowsAffected[0] === 0) {
      throw new Error("Application status could not be updated");
    }

    await transaction.commit();

    return res.status(201).json({
      message: "Interview Scheduled Successfully",
      InterviewID: interviewID,
      ApplicationID: Number(applicationId),
      ApplicationStatus: "Scheduled",
    });
  } catch (err) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.log("Transaction Rollback Error", rollbackError);
      }
    }

    console.log("Interviews Error", err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*CANDIDATE CHECKING INTERVIEW STATUS*/

app.get("/interviews/my", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Candidate") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const candidateIdRequest = pool.request();

    candidateIdRequest.input("UserID", sql.Int, userId);

    const result = await candidateIdRequest.query(
      `select CandidateID from Candidates where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Candidate Not Found",
      });
    }
    const candidateID = result.recordset[0].CandidateID;

    const interviewRequest = pool.request();

    interviewRequest.input("CandidateID", sql.Int, candidateID);

    const interviewStatusResult = await interviewRequest.query(
      `select i.ApplicationID,i.InterviewID,j.JobTitle,i.InterviewDate,i.InterviewMode,i.InterviewLocation,i.Status,i.Notes from Interviews i inner join Applications a on i.ApplicationID=a.ApplicationID  inner join Jobs j on j.JobID=a.JobID where a.CandidateID=@CandidateID `,
    );

    if (interviewStatusResult.recordset.length === 0) {
      return res.status(404).json({
        message: "No Interviews Found",
      });
    }

    return res.status(200).json({
      message: "Scheduled Interview List",
      interviews: interviewStatusResult.recordset,
    });
  } catch (err) {
    console.log("Error in Checking Interview Status", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER INTERVIEWS*/

app.get("/interviews/recruiter", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    // 3. Find RecruiterID
    const recruiterIdRequest = pool.request();

    recruiterIdRequest.input("UserID", sql.Int, userId);

    const recruiterResult = await recruiterIdRequest.query(
      `SELECT RecruiterID
       FROM Recruiters
       WHERE UserID = @UserID`,
    );

    if (recruiterResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterID = recruiterResult.recordset[0].RecruiterID;

    const interviewRequest = pool.request();

    interviewRequest.input("RecruiterID", sql.Int, recruiterID);

    const interviewResult = await interviewRequest.query(
      `SELECT
          i.InterviewID,
          i.ApplicationID,
          a.CandidateID,
          u.Name AS CandidateName,
          u.Email AS CandidateEmail,
          c.Phone AS CandidatePhone,
          j.JobTitle,
          i.InterviewDate,
          i.InterviewMode,
          i.InterviewLocation,
          i.Status,
          i.Notes
       FROM Interviews i
       INNER JOIN Applications a
          ON i.ApplicationID = a.ApplicationID
       INNER JOIN Jobs j
          ON a.JobID = j.JobID
       INNER JOIN Candidates c
          ON a.CandidateID = c.CandidateID
       INNER JOIN Users u
          ON c.UserID = u.UserID
       WHERE j.RecruiterID = @RecruiterID
       ORDER BY i.InterviewDate DESC`,
    );

    return res.status(200).json({
      message:
        interviewResult.recordset.length === 0
          ? "No Interviews Found"
          : "Recruiter Interview List",
      interviews: interviewResult.recordset,
    });
  } catch (err) {
    console.log("Error in Fetching Recruiter Interviews", err);

    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER UPDATING INTERVIEW STATUS*/

app.put("/interviews/:id/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }
    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterIdRequest = pool.request();

    recruiterIdRequest.input("UserID", sql.Int, userId);

    const result = await recruiterIdRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterID = result.recordset[0].RecruiterID;

    const interviewId = Number(req.params.id);

    if (isNaN(interviewId)) {
      return res.status(400).json({
        message: "ID Should Be an Integer",
      });
    }

    const applicationIdRequest = pool.request();

    applicationIdRequest.input("InterviewID", sql.Int, interviewId);

    const applicationIdResult = await applicationIdRequest.query(
      `select ApplicationID from Interviews where InterviewId=@InterviewID`,
    );
    if (applicationIdResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Interview Not Found",
      });
    }

    const applicationId = applicationIdResult.recordset[0].ApplicationID;

    const recruiterCheckRequest = pool.request();

    recruiterCheckRequest.input("ApplicationID", sql.Int, applicationId);

    const recruiterIdCheck = await recruiterCheckRequest.query(
      `select RecruiterID from Jobs  j inner join Applications a on a.JobID=j.JobID where a.ApplicationID=@ApplicationID`,
    );

    if (recruiterIdCheck.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterIdResult = recruiterIdCheck.recordset[0].RecruiterID;

    if (recruiterID !== recruiterIdResult) {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const { status } = req.body;

    const validStatus = ["Scheduled", "Completed", "Cancelled"];

    if (!validStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid status ",
      });
    }

    const updateInterviewRequest = pool.request();

    updateInterviewRequest.input("InterviewID", sql.Int, interviewId);

    updateInterviewRequest.input("Status", sql.VarChar, status);
    await updateInterviewRequest.query(
      `Update Interviews set Status=@Status where InterviewID=@InterviewID`,
    );

    return res.status(200).json({
      message: "Interview Status Updated Successfully",
    });
  } catch (err) {
    console.log("Error in Updating Status", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER DASHBOARD SUMMARY */

app.get("/recruiter/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterIdRequest = pool.request();

    recruiterIdRequest.input("UserID", sql.Int, userId);

    const result = await recruiterIdRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterId = result.recordset[0].RecruiterID;

    const recruiterJobsRequest = pool.request();

    recruiterJobsRequest.input("RecruiterID", sql.Int, recruiterId);

    const totalJobs = await recruiterJobsRequest.query(
      `select count(JobID) as TotalJobs from Jobs where RecruiterID=@RecruiterID`,
    );

    if (totalJobs.recordset.length === 0) {
      return res.status(404).json({
        message: "Jobs Not Found",
      });
    }

    const applicationRequest = pool.request();

    applicationRequest.input("RecruiterID", sql.Int, recruiterId);
    const totalApplications = await applicationRequest.query(
      `select count(ApplicationID) as TotalApplications from Applications  a inner join Jobs j on a.JobID=j.JobID  where j.RecruiterID=@RecruiterID`,
    );

    if (totalApplications.recordset.length === 0) {
      return res.status(404).json({
        message: "Applications Not Found",
      });
    }

    const appliedStatus = "Applied";
    const appliedRequest = pool.request();

    appliedRequest.input("RecruiterID", sql.Int, recruiterId);
    appliedRequest.input("Status", sql.VarChar, appliedStatus);

    const totalApplied = await appliedRequest.query(
      `select count(ApplicationID) as TotalApplied from Applications a inner join Jobs j on a.JobID=j.JobID where j.RecruiterID=@RecruiterID and a.Status=@Status`,
    );

    if (totalApplied.recordset.length === 0) {
      return res.status(404).json({
        message: "No Applied Applications",
      });
    }

    const shortlistStatus = "Shortlisted";
    const shortlistRequest = pool.request();

    shortlistRequest.input("RecruiterID", sql.Int, recruiterId);
    shortlistRequest.input("Status", sql.VarChar, shortlistStatus);

    const totalShortlisted = await shortlistRequest.query(
      `select count(ApplicationID) as TotalShortlisted from Applications a inner join Jobs j on a.JobID=j.JobID where j.RecruiterID=@RecruiterID and a.Status=@Status`,
    );
    if (totalShortlisted.recordset.length === 0) {
      return res.status(404).json({
        message: "No Shortlisted Applications",
      });
    }
    const rejectedStatus = "Rejected";
    const rejectedRequest = pool.request();

    rejectedRequest.input("RecruiterID", sql.Int, recruiterId);
    rejectedRequest.input("Status", sql.VarChar, rejectedStatus);

    const totalRejected = await rejectedRequest.query(
      `select count(ApplicationID) as TotalRejected from Applications a inner join Jobs j on a.JobID=j.JobID where j.RecruiterID=@RecruiterID and a.Status=@Status`,
    );
    if (totalRejected.recordset.length === 0) {
      return res.status(404).json({
        message: "No Rejected Applications",
      });
    }

    return res.status(200).json({
      message: "Dashboard",
      totalJobs: totalJobs.recordset[0].TotalJobs,
      totalApplications: totalApplications.recordset[0].TotalApplications,
      totalApplied: totalApplied.recordset[0].TotalApplied,
      totalShortlisted: totalShortlisted.recordset[0].TotalShortlisted,
      totalRejected: totalRejected.recordset[0].TotalRejected,
    });
  } catch (err) {
    console.log("Error in Recruiter Dashboard", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER DASHBOARD JOB WISE STATISTICS*/

app.get("/recruiter/dashboard/jobs", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterIdRequest = pool.request();

    recruiterIdRequest.input("UserID", sql.Int, userId);

    const result = await recruiterIdRequest.query(
      `Select RecruiterID from Recruiters where UserID=@UserID`,
    );
    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterId = result.recordset[0].RecruiterID;

    const totalApplicationsRequest = pool.request();

    totalApplicationsRequest.input("RecruiterID", sql.Int, recruiterId);

    const totalApplications = await totalApplicationsRequest.query(
      `SELECT
    j.JobID,
    j.JobTitle,
    COUNT(a.ApplicationID) AS TotalApplications,
    SUM(CASE WHEN a.Status = 'Applied' THEN 1 ELSE 0 END) AS TotalApplied,
    SUM(CASE WHEN a.Status = 'Shortlisted' THEN 1 ELSE 0 END) AS TotalShortlisted,
    SUM(CASE WHEN a.Status = 'Rejected' THEN 1 ELSE 0 END) AS TotalRejected
FROM Jobs j
LEFT JOIN Applications a
    ON j.JobID = a.JobID
WHERE j.RecruiterID = @RecruiterID
GROUP BY
    j.JobID,
    j.JobTitle;`,
    );

    return res.status(200).json({
      Jobs: totalApplications.recordset,
    });
  } catch (err) {
    console.log("Error in JobApplications Status", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER APPLICATIONS STATUS OVERVIEW*/

app.get("/recruiter/dashboard/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Recruiter") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = req.user.userId;

    const pool = await poolPromise;

    const recruiterIdRequest = pool.request();

    recruiterIdRequest.input("UserID", sql.Int, userId);
    const result = await recruiterIdRequest.query(
      `select RecruiterID from Recruiters where UserID=@UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "Recruiter Not Found",
      });
    }

    const recruiterId = result.recordset[0].RecruiterID;

    const findapplicationRequest = pool.request();

    findapplicationRequest.input("RecruiterID", sql.Int, recruiterId);

    const applicationResult = await findapplicationRequest.query(
      `select a.Status,count(a.ApplicationID) as Count  from Applications a inner join Jobs j on a.JobID=j.JobID where j.RecruiterID=@RecruiterID group by a.Status`,
    );

    if (applicationResult.recordset.length === 0) {
      return res.status(404).json({
        message: "Application Status Not Found",
      });
    }
    return res.status(200).json({
      StatusOverview: applicationResult.recordset,
    });
  } catch (err) {
    console.log("Error in StatusOverview", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

/*RECRUITER RECENT APPLICATIONS */

app.get(
  "/recruiter/dashboard/recent-applications",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;

      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();

      recruiterIdRequest.input("UserID", sql.Int, userId);
      const result = await recruiterIdRequest.query(
        `select RecruiterID from Recruiters where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterId = result.recordset[0].RecruiterID;

      const recentApplicationsRequest = pool.request();

      recentApplicationsRequest.input("RecruiterID", sql.Int, recruiterId);

      const recentApplicationResult = await recentApplicationsRequest.query(
        `select Top 5 a.ApplicationID,j.JobID,j.JobTitle,u.Name,a.ApplicationDate,a.Status from Applications a inner join Jobs j on a.JobID=j.JobID inner join Candidates c on a.CandidateID=c.CandidateID inner join Users u on c.UserID=u.UserID where j.RecruiterID=@RecruiterID order by ApplicationDate desc`,
      );

      if (recentApplicationResult.recordset.length === 0) {
        return res.status(404).json({
          message: "No Recent Applications",
        });
      }

      return res.status(200).json({
        RecentApplications: recentApplicationResult.recordset,
      });
    } catch (err) {
      console.log("Error in Recent Applications", err);
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

/*RECRUITER UPCOMING INTERVIEWS*/

app.get(
  "/recruiter/dashboard/upcoming-interviews",
  authMiddleware,
  async (req, res) => {
    try {
      if (req.user.role !== "Recruiter") {
        return res.status(403).json({
          message: "Access Denied",
        });
      }

      const userId = req.user.userId;

      const pool = await poolPromise;

      const recruiterIdRequest = pool.request();

      recruiterIdRequest.input("UserID", sql.Int, userId);
      const result = await recruiterIdRequest.query(
        `select RecruiterID from Recruiters where UserID=@UserID`,
      );

      if (result.recordset.length === 0) {
        return res.status(404).json({
          message: "Recruiter Not Found",
        });
      }

      const recruiterId = result.recordset[0].RecruiterID;

      const upcomingInterviewRequest = pool.request();

      upcomingInterviewRequest.input("RecruiterID", sql.Int, recruiterId);

      const upcomingInterviewResult = await upcomingInterviewRequest.query(
        `Select i.InterviewID,i.ApplicationID,i.InterviewDate,i.InterviewMode,i.InterviewLocation,i.Status,i.Notes,i.CreatedAt from Applications a inner join Interviews i on a.ApplicationID=i.ApplicationID inner join Jobs j on a.JobID=j.JobID where j.RecruiterID=@RecruiterID 
      AND i.InterviewDate > GETDATE() order by i.InterviewDate asc `,
      );

      if (upcomingInterviewResult.recordset.length === 0) {
        return res.status(404).json({
          message: "No Upcoming Interviews",
        });
      }

      return res.status(200).json({
        UpcomingInterviews: upcomingInterviewResult.recordset,
      });
    } catch (err) {
      console.log("Error in Upcoming Interviews", err);
      return res.status(500).json({
        message: "Server Error",
      });
    }
  },
);

// 1. Admin Dashboard Summary

app.get("/admin/dashboard/summary", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const pool = await poolPromise;

    const usersResult = await pool
      .request()
      .query(`SELECT COUNT(UserID) AS TotalUsers FROM Users`);

    const candidatesResult = await pool
      .request()
      .query(`SELECT COUNT(CandidateID) AS TotalCandidates FROM Candidates`);

    const recruitersResult = await pool
      .request()
      .query(`SELECT COUNT(RecruiterID) AS TotalRecruiters FROM Recruiters`);

    const jobsResult = await pool
      .request()
      .query(`SELECT COUNT(JobID) AS TotalJobs FROM Jobs`);

    const applicationsResult = await pool
      .request()
      .query(
        `SELECT COUNT(ApplicationID) AS TotalApplications FROM Applications`,
      );

    return res.status(200).json({
      totalUsers: usersResult.recordset[0].TotalUsers,
      totalCandidates: candidatesResult.recordset[0].TotalCandidates,
      totalRecruiters: recruitersResult.recordset[0].TotalRecruiters,
      totalJobs: jobsResult.recordset[0].TotalJobs,
      totalApplications: applicationsResult.recordset[0].TotalApplications,
    });
  } catch (err) {
    console.log("Admin Dashboard Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 2. Get All Users

app.get("/admin/users", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().query(
      `SELECT UserID, Name, Email, Role, IsActive
       FROM Users
       ORDER BY UserID DESC`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "No Users Found",
      });
    }

    return res.status(200).json({
      users: result.recordset,
    });
  } catch (err) {
    console.log("Admin Users Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 3. Get User Details

app.get("/admin/users/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message: "Invalid UserID",
      });
    }

    const pool = await poolPromise;

    const request = pool.request();

    request.input("UserID", sql.Int, userId);

    const result = await request.query(
      `SELECT UserID, Name, Email, Role, IsActive
       FROM Users
       WHERE UserID = @UserID`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      user: result.recordset[0],
    });
  } catch (err) {
    console.log("Admin User Details Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 4. Activate / Deactivate User

app.put("/admin/users/:userId/status", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message: "Invalid UserID",
      });
    }

    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "isActive must be true or false",
      });
    }

    const pool = await poolPromise;

    const request = pool.request();

    request.input("UserID", sql.Int, userId);
    request.input("IsActive", sql.Bit, isActive);

    const result = await request.query(
      `UPDATE Users
       SET IsActive = @IsActive
       WHERE UserID = @UserID`,
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      message: "User Status Updated",
    });
  } catch (err) {
    console.log("Admin User Status Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 5. Delete User

app.delete("/admin/users/:userId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const userId = Number(req.params.userId);

    if (!Number.isInteger(userId)) {
      return res.status(400).json({
        message: "Invalid UserID",
      });
    }

    const pool = await poolPromise;

    const request = pool.request();

    request.input("UserID", sql.Int, userId);

    const result = await request.query(
      `DELETE FROM Users
       WHERE UserID = @UserID`,
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "User Not Found",
      });
    }

    return res.status(200).json({
      message: "User Deleted Successfully",
    });
  } catch (err) {
    console.log("Admin Delete User Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 6. Get All Jobs

app.get("/admin/jobs", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().query(
      `SELECT
        j.JobID,
        j.JobTitle,
        j.RecruiterID,
        r.CompanyName,
        j.Location,
        r.CompanyDescription
       FROM Jobs j
       INNER JOIN Recruiters r
       ON j.RecruiterID = r.RecruiterID
       ORDER BY j.JobID DESC`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "No Jobs Found",
      });
    }

    return res.status(200).json({
      jobs: result.recordset,
    });
  } catch (err) {
    console.log("Admin Jobs Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 7. Delete Job

app.delete("/admin/jobs/:jobId", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const jobId = Number(req.params.jobId);

    if (!Number.isInteger(jobId)) {
      return res.status(400).json({
        message: "Invalid JobID",
      });
    }

    const pool = await poolPromise;

    const request = pool.request();

    request.input("JobID", sql.Int, jobId);

    const result = await request.query(
      `DELETE FROM Jobs
       WHERE JobID = @JobID`,
    );

    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({
        message: "Job Not Found",
      });
    }

    return res.status(200).json({
      message: "Job Deleted Successfully",
    });
  } catch (err) {
    console.log("Admin Delete Job Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 8. Get All Applications

app.get("/admin/applications", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().query(
      `SELECT
        a.ApplicationID,
        a.JobID,
        j.JobTitle,
        a.CandidateID,
        u.Name,
        u.Email,
        a.ApplicationDate,
        a.Status
       FROM Applications a
       INNER JOIN Jobs j
       ON a.JobID = j.JobID
       INNER JOIN Candidates c
       ON a.CandidateID = c.CandidateID
       INNER JOIN Users u
       ON c.UserID = u.UserID
       ORDER BY a.ApplicationDate DESC`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "No Applications Found",
      });
    }

    return res.status(200).json({
      applications: result.recordset,
    });
  } catch (err) {
    console.log("Admin Applications Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 9. Get All Recruiters

app.get("/admin/recruiters", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().query(
      `SELECT
        r.RecruiterID,
        r.UserID,
        u.Name,
        u.Email,
        r.CompanyName,
        r.CompanyDescription
       FROM Recruiters r
       INNER JOIN Users u
       ON r.UserID = u.UserID
       ORDER BY r.RecruiterID DESC`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "No Recruiters Found",
      });
    }

    return res.status(200).json({
      recruiters: result.recordset,
    });
  } catch (err) {
    console.log("Admin Recruiters Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

// 10. Get All Candidates

app.get("/admin/candidates", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Access Denied",
      });
    }

    const pool = await poolPromise;

    const result = await pool.request().query(
      `SELECT
        c.CandidateID,
        c.UserID,
        u.Name,
        u.Email,
        c.Phone,
        c.ResumePath
       FROM Candidates c
       INNER JOIN Users u
       ON c.UserID = u.UserID
       ORDER BY c.CandidateID DESC`,
    );

    if (result.recordset.length === 0) {
      return res.status(404).json({
        message: "No Candidates Found",
      });
    }

    return res.status(200).json({
      candidates: result.recordset,
    });
  } catch (err) {
    console.log("Admin Candidates Error", err);
    return res.status(500).json({
      message: "Server Error",
    });
  }
});

app.listen(port, () => {
  console.log(`server is running on port http://localhost:${port}`);
});
