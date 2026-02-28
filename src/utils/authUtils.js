export const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) return { valid: false, message: "Password must be at least 8 characters long" };
    if (!hasUpperCase) return { valid: false, message: "Password must contain an uppercase letter" };
    if (!hasLowerCase) return { valid: false, message: "Password must contain a lowercase letter" };
    if (!hasNumbers) return { valid: false, message: "Password must contain a number" };
    if (!hasSpecialChar) return { valid: false, message: "Password must contain a special character" };

    return { valid: true };
};

export const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
