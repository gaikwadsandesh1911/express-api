import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcryptjs";
import crypto from 'crypto'

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please enter your name."],
        trim: true
    },
    email: {
        type: String,
        required: [true, "Please enter an email."],
        trim: true,
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, "Please enter a valid email."]
    },
    photo: String,
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user"
    },
    password: {
        type: String,
        required: [true, "Please enter a password."],
        minlength: 8,
        // select: false   // when we get user profile it does not shows password field
    },
    confirmPassword: {
        type: String,
        required: [true, "Please confirm your password."],
        validate: {
            validator: function(val){
                return val === this.password // return boolean val
            },
            message: "Password and ConfirmPassword does not match"
        }
    },
    isActive: {
        type: Boolean,
        default: true,
        select: false
    },
    passwordResetToken: String,
    passwordResetTokenExpires: Date,
}, { timestamps: true});

// ----------------------------------------------------------------------------------------------------------
//  Before saving user we encrypt the password and save encrypted password
userSchema.pre('save', async function(next){
    //  when we create or update password then only encrypt if want to update email then keep as it is so
    
    //  this means entire object being proceess. isModified() is function.
    if(!this.isModified('password')){
        return next();
    }
    // encrpt password
    try {
        this.password = await bcrypt.hash(this.password, 12);
        this.confirmPassword = undefined;   // do not save confirmPassword in db;
        next();
    } catch (error) {
        next(error);
    }

});

// ----------------------------------------------------------------------------------------------------------

// create instance method so, it will be available on all documents of User collection.
//  and will be access on any instance of User model like const user = await User.findOne({})
// here user is an instance of User model
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
      // 'this.password' refers to the hashed password stored in the database
}

// ----------------------------------------------------------------------------------------------------------

//  generate token for password reset
userSchema.methods.generateResetPasswordToken = function () {
    // plain text
    const resetToken = crypto.randomBytes(32).toString("hex");
    
    // hash the token and set to user in db..
    this.passwordResetToken = crypto.createHash("sha256").update(resetToken).digest('hex');
    // console.log("HashedpasswordResetToken", this.passwordResetToken);
    
    // set expiration (eg: 10min)
    this.passwordResetTokenExpires = Date.now() + 10 * 60 * 1000;

    // // Return plain token (to send in email)
    // console.log({resetToken});
    return resetToken;
}

// ----------------------------------------------------------------------------------------------------------

// before query that is start with find keyword execute this fun...
//  this keyword means.. query that is being processing.
userSchema.pre(/^find/, function(next){
    if (this.getOptions().bypassActive) return next(); // next() here, means move to next step.
    this.find({ isActive: { $ne: false } });
    next();
});

// ----------------------------------------------------------------------------------------------------------


export const User = mongoose.model("User", userSchema);
