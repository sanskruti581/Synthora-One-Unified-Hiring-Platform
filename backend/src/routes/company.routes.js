import { Router } from "express";
import bcrypt from "bcryptjs";
import Company from "../models/Company.js";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { companyName, hrName, email, phone, website, password, confirmPassword, acceptedTerms } = req.body;

    if (!companyName || !hrName || !email || !phone || !website || !password || !confirmPassword) {
      return res.status(400).json({ message: "All company registration fields are required" });
    }

    if (!acceptedTerms) {
      return res.status(400).json({ message: "Terms and conditions must be accepted" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingCompany = await Company.findOne({ email: normalizedEmail });

    if (existingCompany) {
      return res.status(409).json({ message: "Company email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const company = await Company.create({
      companyName,
      hrName,
      email: normalizedEmail,
      phone,
      website,
      passwordHash,
    });

    return res.status(201).json({ id: company._id, companyName: company.companyName, email: company.email });
  } catch (error) {
    console.error("Company registration failed:", error);

    if (error.code === 11000) {
      return res.status(409).json({ message: "Company email already registered" });
    }

    return res.status(500).json({ message: "Registration failed. Please try again." });
  }
});

export default router;
