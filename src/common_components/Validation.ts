interface ValidationMessages {
    emailRequired: string;
    emailInvalid: string;
    passwordRequired: string;
    firstNameRequired: string;
    lastNameRequired: string;
    roleRequired: string;
    designationRequired: string;
    statusRequired: string;
    two_factor_authentication: string;
    locationRequired: string;
    storeRequired: string;
    employeePortfolioRequired: string;
}

const ValidationMessage: ValidationMessages = {
    emailRequired: "Email is required",
    emailInvalid: "Invalid email format",
    passwordRequired: "Password is required",
    firstNameRequired: "First name is required",
    lastNameRequired: "Last name is required",
    roleRequired: "Role is required",
    designationRequired: "Designation is required",
    statusRequired: "Status is required",
    two_factor_authentication: "Authentication Method is required",
    locationRequired: "Location is required",
    storeRequired: "Store is required",
    employeePortfolioRequired: "Employee portfolio is required"
};

export default ValidationMessage;
