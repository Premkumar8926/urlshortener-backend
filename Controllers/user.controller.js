import Users from "../Models/user.schema.js";
import bcrypt from "bcryptjs";
import { mail, verifyMail } from "../Services/nodemailer.services.js";
import randomString from "randomstring";
import jwt from "jsonwebtoken";
import shortid from "shortid";
import dotenv from "dotenv";
import ShortUrls from "../Models/shortUrls.schema.js";
import mongoose from "mongoose";

dotenv.config();

// Controller function to handle user registration
export const register = async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  try {
    // Check if user already exists
    const user = await Users.findOne({ email });
    if (user) {
      return res.status(200).json({
        status: false,
        message: "User already registered",
      });
    }

       // Hash the password and create a new user
       const hashPassword = await bcrypt.hash(password, 10);
       const newUser = await Users.create({
         email,
         password: hashPassword,
         firstName,
         lastName,
       });

    // Generate JWT token for account activation
    const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Log the token to the console for easy retrieval in local development
    console.log("Your verification token: ", token);

    verifyMail(email, token); // Send account activation email

    return res.status(201).json({
      status: true,
      message: "User registered. Please verify your email.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      status: false,
      message: "Error registering user",
    });
  }
};

// Controller function to handle account activation
export const accountActivation = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;
    const user = await Users.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.activationStatus) {
      return res.status(200).json({ message: "Already activated" });
    }

    // Activate user account
    user.activationStatus = true;
    await user.save();

    res.status(200).json({ message: "Account activated" });
  } catch (error) {
    console.log(error);
    return res.status(400).json({
      message: "Invalid or expired token",
    });
  }
};

// Controller function to handle user login
export const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.activationStatus) {
      return res.status(403).json({ message: "Account not activated" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { expiresIn: "1h" });
    return res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Login failed" });
  }
};

// Controller function to handle forgot password
export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const user = await Users.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const randomStr = randomString.generate(20);
    const expiryTime = Date.now() + 600000; // 10 minutes

    user.verificationString = randomStr;
    user.expiryTime = expiryTime;
    await user.save();

    mail(email, randomStr); // Send password reset email

    res.status(200).json({ message: "Password reset link sent" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error processing request" });
  }
};

// Controller function to handle verification of password reset links
export const verifyString = async (req, res) => {
  const { verificationString } = req.body;
  try {
    const user = await Users.findOne({ verificationString });
    if (!user) {
      return res.status(400).json({ message: "Invalid verification string" });
    }

    const currentTime = Date.now();
    if (user.expiryTime < currentTime) {
      user.verificationString = null;
      user.expiryTime = null;
      await user.save();
      return res.status(400).json({ message: "Link expired" });
    }

    res.status(200).json({ message: "Verification successful" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error verifying string" });
  }
};

// Controller function to handle password changes
export const changePassword = async (req, res) => {
  const { verificationString, newPassword } = req.body;
  try {
    const user = await Users.findOne({ verificationString });
    if (!user) {
      return res.status(400).json({ message: "Invalid verification string" });
    }

    const hashPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashPassword;
    user.verificationString = null;
    user.expiryTime = null;
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error changing password" });
  }
};

// Controller function to create short URL
export const createShorturl = async (req, res) => {
  const { originalUrl, token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    let unique = false;
    let shortId;
    while (!unique) {
      shortId = shortid.generate();
      const existingUrl = await ShortUrls.findOne({ shortId });
      if (!existingUrl) {
        unique = true;
      }
    }

    const shortUrl = `${process.env.BASE_URL}/${shortId}`;

    const shortUrlDoc = await ShortUrls.create({
      originalUrl,
      shortId,
      shortUrl,
      userId,
      clicksCount: 0,
    });

    res.status(200).json({ shortUrl });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating short URL" });
  }
};

// Controller function to open a short URL and redirect to the original URL
export const openShortUrl = async (req, res) => {
  const { shortId } = req.params;
  try {
    const urlDoc = await ShortUrls.findOne({ shortId });
    if (!urlDoc) {
      return res.status(404).json({ message: "Short URL not found" });
    }

    urlDoc.clicksCount++;
    await urlDoc.save();

    res.redirect(urlDoc.originalUrl);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error opening short URL" });
  }
};

// Controller function to get the short URLs created by a user
export const getShortUrlsCreated = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    const urls = await ShortUrls.find({ userId }, "clicksCount shortUrl");
    res.status(200).json({ urls });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching URLs" });
  }
};

// Controller function to get dashboard data
export const getDashboardData = async (req, res) => {
  const { token } = req.body;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    const startOfMonth = new Date(new Date().setDate(1));
    const urlsThisMonth = await ShortUrls.find({
      userId,
      createdAt: { $gte: startOfMonth },
    });

    res.status(200).json({
      urlsThisMonth,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error fetching dashboard data" });
  }
};