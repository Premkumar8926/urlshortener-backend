import mongoose from "mongoose";

// Define the schema for the User model
const userSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // Ensure unique email
        match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: true
    },
    activationStatus: {
        type: Boolean,
        default: false
    },
    verificationString: {
        type: String,
        default: null
    },
    expiryTime: {
        type: Number,
        default: null
    }
}, { timestamps: true }); // Add timestamps to track creation and update times

// Create a Mongoose model named 'Users' based on the userSchema
const Users = mongoose.model("Users", userSchema);

export default Users;
