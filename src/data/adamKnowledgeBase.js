/**
 * Admin Adam Knowledge Base
 * Structured Q&A data for the chatbot
 */

export const knowledgeBase = [
  // ============ VOUCHER ISSUING & SPENDING ============
  {
    category: "Voucher Issuing & Spending",
    question: "How long does it take for vouchers to be issued?",
    keywords: ["how long", "voucher", "issued", "issue", "delivery", "time", "take", "receive"],
    answer: "Voucher delivery time can vary depending on the process in which it is sent or uploaded to Halfords. However, once Halfords receive the application, if delivered prior to 3pm they are uploaded the same day. After 3pm, they are issued within 1 working day."
  },
  {
    category: "Voucher Issuing & Spending",
    question: "How long do I have to spend my voucher?",
    keywords: ["how long", "spend", "voucher", "expire", "expiry", "valid", "use"],
    answer: "The voucher if left unspent will expire within 4 months of being issued. If there are any issues with this date, please contact our customer support team on C2WCustomerEnquiry@halfords.co.uk or 0345 504 6444 to discuss a potential extension of the voucher."
  },
  {
    category: "Voucher Issuing & Spending",
    question: "Why have I not received my voucher?",
    keywords: ["not received", "haven't received", "no voucher", "where", "voucher", "waiting", "missing"],
    answer: "If you have not received your voucher after a prolonged period, please request information from your employer or request them to chase your LOC. It is possible there might be an issue with your application preventing you from receiving this, so please chase."
  },
  {
    category: "Voucher Issuing & Spending",
    question: "Where is my voucher?",
    keywords: ["where", "voucher", "find", "locate", "check"],
    answer: "You will be emailed your cycle to work voucher when approved. If you have submitted an application and have not yet received anything, it is likely that it is pending approval or has not yet been uploaded."
  },
  {
    category: "Voucher Issuing & Spending",
    question: "I haven't received my LOC yet?",
    keywords: ["haven't received", "not received", "loc", "waiting", "missing", "where loc"],
    answer: "If you have not received your voucher after a prolonged period, please request information from your employer or request them to chase your LOC. It is possible there might be an issue with your application preventing you from receiving this, so please chase."
  },
  {
    category: "Voucher Issuing & Spending",
    question: "When are LOCs sent out after they are sent to employee benefits?",
    keywords: ["when", "loc", "sent", "send", "employee benefits", "after"],
    answer: "If they are received prior to 3pm they are sent out the same day, after 3pm within one working day. Any longer, please chase this as there may be issues with applications or the account."
  },

  // ============ VOUCHER STATUS ============
  {
    category: "Voucher Status",
    question: "What is the difference between active and spent?",
    keywords: ["difference", "active", "spent", "status", "mean", "meaning"],
    answer: "Spent means the employee has utilised the entirety of the LOC and there is a value of 0 left on the voucher. Active means that there is still some value on the LOC - this is anything greater than zero. If an employee has one penny left on the LOC, it will show as active."
  },

  // ============ CANCELLATIONS ============
  {
    category: "Cancellations",
    question: "Can I cancel my voucher?",
    keywords: ["cancel", "voucher", "cancellation", "can i"],
    answer: "Cancellations are allowed within the 14 day cancellation period. In accordance to our cancellation policy, the employee will need to contact our customer experience team to discuss cancellation of their agreement & LOC. They can be contacted on C2WCustomerEnquiry@halfords.co.uk or 0345 504 6444."
  },
  {
    category: "Cancellations",
    question: "Employee has requested a cancellation?",
    keywords: ["employee", "requested", "cancellation", "wants cancel", "request cancel"],
    answer: "In accordance to our cancellation policy, the employee will need to contact our customer experience team to discuss cancellation of their agreement & LOC. They can be contacted on C2WCustomerEnquiry@halfords.co.uk or 0345 504 6444."
  },
  {
    category: "Cancellations",
    question: "I want to cancel my LOC",
    keywords: ["want", "cancel", "loc", "cancellation"],
    answer: "In accordance to our cancellation policy, the employee will need to contact our customer experience team to discuss cancellation of their agreement & LOC. They can be contacted on C2WCustomerEnquiry@halfords.co.uk or 0345 504 6444."
  },
  {
    category: "Cancellations",
    question: "Can I cancel outside of the 14 day cancellation period?",
    keywords: ["cancel", "outside", "14 day", "after", "late", "cancellation period"],
    answer: "It is possible to cancel outside of the 14 day cancellation period, however this is only due to certain circumstances."
  },

  // ============ LOC AMOUNTS ============
  {
    category: "LOC Amounts",
    question: "Employee wants to increase or decrease LOC amount?",
    keywords: ["increase", "decrease", "change", "loc", "amount", "alter", "modify", "adjust"],
    answer: "Unfortunately once an LOC is issued we are unable to alter the amount. In order to change the voucher amount, the employee will need to request a cancellation and reapply for a higher or lower amount."
  },

  // ============ EMPLOYER/PORTAL ISSUES ============
  {
    category: "Employer/Portal Issues",
    question: "Why can't I see an employee's application?",
    keywords: ["can't see", "cannot see", "employee", "application", "missing", "find", "visible", "portal"],
    answer: "If an employee has used the correct employer code (please check this) and there is no employee application on the portal, then it could be a few things: the scheme you are viewing is incorrect (however if you only have the one scheme and employees have utilised this before, this is unlikely), the employee may not yet be uploaded to the scheme and this is pending, or the employee has not completed the application. Please contact employeebenefits@halfords.co.uk to further this request."
  },
  {
    category: "Employer/Portal Issues",
    question: "I am unable to approve an employee's application?",
    keywords: ["unable", "approve", "application", "can't approve", "cannot approve", "approval"],
    answer: "When approving an application in the employers portal, ensure you are using the arrow on the far right of the pending application, not clicking the agreement number on the left as this is a view only mode. If the approval button is not visible in the drop down arrow and then 'edit', it is likely due to an issue of credit on the account and you need to contact your account manager to resolve this issue."
  },
  {
    category: "Employer/Portal Issues",
    question: "I am unable to apply, it says the employer code doesn't work?",
    keywords: ["unable", "apply", "employer code", "doesn't work", "not working", "invalid", "code"],
    answer: "This could be for a few reasons: the employer code is incorrect so please double check this from either account manager or marketing, the scheme window could have closed and is not allowing any further applications, or you are using the old/incorrect website. Please ensure you are using: https://cycle2workapplication.halfords.com"
  },
  {
    category: "Employer/Portal Issues",
    question: "I am unable to log into the portal",
    keywords: ["unable", "login", "log in", "portal", "can't login", "cannot login", "access"],
    answer: "Check that you are using your username not your email and try a password reset. Failing this, contact employeebenefits@halfords.co.uk and our admin team can issue you a new portal invite to create a new username and password."
  },
  {
    category: "Employer/Portal Issues",
    question: "Password reset isn't working",
    keywords: ["password", "reset", "not working", "doesn't work", "failed"],
    answer: "It's possible the account may be locked or the information incorrect. Please double check you are using the username and not your email. If this still is an issue, contact employeebenefits@halfords.co.uk and our admin team can issue you a new portal invite to create a new username and password."
  },
  {
    category: "Employer/Portal Issues",
    question: "How can I get my colleague set up onto the portal?",
    keywords: ["colleague", "set up", "portal", "add", "new user", "access"],
    answer: "Contact employeebenefits@halfords.co.uk with your request and your colleague's name and email, and our admin team can issue your colleague a new portal invite to create a portal login."
  },
  {
    category: "Employer/Portal Issues",
    question: "Can I change my username?",
    keywords: ["change", "username", "update", "modify"],
    answer: "Yep! Contact employeebenefits@halfords.co.uk and our admin team can change your username to whatever suits."
  },
  {
    category: "Employer/Portal Issues",
    question: "The benefits manager has left the company, can the main contact be changed?",
    keywords: ["benefits manager", "left", "company", "main contact", "change contact", "key contact"],
    answer: "We are able to change the key contact for a company, so if this is the case please contact employeebenefits@halfords.co.uk and our admin team will change the contact to the appropriate address."
  },
  {
    category: "Employer/Portal Issues",
    question: "Can I change the contact for the scheme?",
    keywords: ["change", "contact", "scheme", "update contact"],
    answer: "We are able to change the key contact for a company, so if this is the case please contact employeebenefits@halfords.co.uk and our admin team will change the contact to the appropriate address."
  },
  {
    category: "Employer/Portal Issues",
    question: "My colleague has left the company, can they be removed from the portal?",
    keywords: ["colleague", "left", "remove", "portal", "delete user"],
    answer: "Yep! Please contact employeebenefits@halfords.co.uk with your request and provide the details of the colleague you wish to be removed from the portal, and our admin team will action this for you."
  },
  {
    category: "Employer/Portal Issues",
    question: "I have paid credit why can I not approve applications?",
    keywords: ["paid", "credit", "approve", "applications", "can't approve"],
    answer: "It is likely these transactions are pending and our systems are waiting for them to update in order to allow new applications to go through. Please contact your account manager for more information."
  },

  // ============ FINANCE/INVOICES ============
  {
    category: "Finance/Invoices",
    question: "When are invoices sent?",
    keywords: ["when", "invoices", "sent", "send", "receive", "invoice"],
    answer: "Invoices are sent out at the end of every month unless the account is a pro forma, in which invoices are sent out after the pre-approval."
  },
  {
    category: "Finance/Invoices",
    question: "Do I have to pay upfront?",
    keywords: ["pay", "upfront", "advance", "before", "pro forma", "proforma"],
    answer: "Not unless you have a pro-forma account. Invoices are at the end of every month for a credit account and the LOC is issued before this. Pro formas require approval and then receive an invoice, and then once this is paid they can issue the LOC."
  },

  // ============ SCHEME/SALARY ============
  {
    category: "Scheme/Salary",
    question: "How does cycle to work save money?",
    keywords: ["how", "save", "money", "cycle to work", "savings", "benefit"],
    answer: "Cycle to work essentially saves money by paying out of your wage before you get paid, and therein taxed. By Halfords owning the bike and the bike being paid for out of a 'salary sacrifice', money is saved every month."
  },
  {
    category: "Scheme/Salary",
    question: "Can I increase the scheme limit?",
    keywords: ["increase", "scheme", "limit", "maximum", "raise"],
    answer: "The employer can request a scheme limit increase from Halfords at any time - just contact your account manager or employeebenefits@halfords.co.uk."
  },
  {
    category: "Scheme/Salary",
    question: "Does it have to be 12 month salary sacrifice?",
    keywords: ["12 month", "salary sacrifice", "duration", "length", "term", "months"],
    answer: "It is up to the employer if they would like to allow a lengthier salary sacrifice, so this needs to be chased with the employer. Possible options are 12 / 18 / 24 / 36 months."
  },
  {
    category: "Scheme/Salary",
    question: "How long is the salary sacrifice contract?",
    keywords: ["how long", "salary sacrifice", "contract", "duration", "length"],
    answer: "It is typically 12 months, however it is up to the employer if they would like to allow a lengthier salary sacrifice, so this needs to be chased with the employer. Possible options are 12 / 18 / 24 / 36 months."
  },

  // ============ END OF HIRE ============
  {
    category: "End of Hire",
    question: "What is End of hire?",
    keywords: ["what", "end of hire", "eoh", "end hire", "meaning"],
    answer: "At the end of the hire, the employee will receive an email with their options. Options: (1) Cost free transfer to employee after 3-5 years (Halfords temporarily holds ownership to reduce tax value). (2) Return bike to Halfords. (3) Pay fair market value set by HMRC to own immediately."
  },
  {
    category: "End of Hire",
    question: "What are the end of hire options?",
    keywords: ["end of hire", "options", "eoh", "choices", "what happens"],
    answer: "Options: (1) Cost free transfer to employee after 3-5 years (Halfords temporarily holds ownership to reduce tax value). (2) Return bike to Halfords. (3) Pay fair market value set by HMRC to own immediately."
  },

  // ============ DUPLICATES/CANCELLATIONS ============
  {
    category: "Duplicates/Cancellations",
    question: "I've been sent the same LOC twice?",
    keywords: ["same", "loc", "twice", "duplicate", "two", "sent twice"],
    answer: "This could be an admin/system error and you have been incorrectly issued a duplicate LOC. Please refrain from utilising both and contact the customer team. If one of the LOCs is later cancelled, this means the error was caught and you can safely disregard it."
  },
  {
    category: "Duplicates/Cancellations",
    question: "I can see an employee is on my invoice twice, is this an error?",
    keywords: ["invoice", "twice", "duplicate", "employee", "error", "double"],
    answer: "This could be an admin/system error and they have been incorrectly issued a duplicate LOC. Please contact the admin team at employeebenefits@halfords.co.uk."
  },
  {
    category: "Duplicates/Cancellations",
    question: "Duplicate invoice?",
    keywords: ["duplicate", "invoice", "twice", "double"],
    answer: "If they did not apply twice, this could be an admin/system error and they have been incorrectly issued a duplicate LOC. Please contact the admin team at employeebenefits@halfords.co.uk."
  },
  {
    category: "Duplicates/Cancellations",
    question: "I have a duplicate LOC?",
    keywords: ["duplicate", "loc", "two", "twice"],
    answer: "This could be an admin/system error and you have been incorrectly issued a duplicate LOC. Please refrain from utilising both of the vouchers and contact the customer team. If one LOC is later cancelled, this means the error was caught and you can safely disregard it."
  },
  {
    category: "Duplicates/Cancellations",
    question: "Why was my LOC Cancelled?",
    keywords: ["why", "loc", "cancelled", "canceled", "cancellation"],
    answer: "It is possible the LOC was uploaded twice and a duplicate was issued - the LOC that was cancelled was possibly the duplicate. If you cannot see another LOC in your email, please contact employeebenefits@halfords.co.uk."
  },
  {
    category: "Duplicates/Cancellations",
    question: "Why was my application rejected?",
    keywords: ["why", "application", "rejected", "rejection", "denied"],
    answer: "There are a few reasons as to why the application was rejected. The most common was that the application was outside of the specified scheme maximum and minimum. Please double check this, and if this is not the case, please contact your employer."
  },

  // ============ SCHEME MAXIMUM ============
  {
    category: "Scheme Maximum",
    question: "How do I know what my scheme maximum is?",
    keywords: ["scheme", "maximum", "limit", "how much", "max"],
    answer: "On the portal you should be able to see your scheme maximum on the 'My Scheme' Page. If not, contact your account manager to confirm."
  },
  {
    category: "Scheme Maximum",
    question: "How do I know how much I can apply for?",
    keywords: ["how much", "apply", "limit", "amount", "maximum"],
    answer: "Check the marketing for your company's cycle to work scheme as it should state the scheme limits. Otherwise, contact your employer."
  },

  // ============ EARLY LEAVER ============
  {
    category: "Early Leaver",
    question: "What is an early leaver?",
    keywords: ["early leaver", "what", "meaning", "definition", "leave early"],
    answer: "Cycle to work allows employees to hire a bike from their employer over a fixed period. The employee signs a hire agreement, which commits them to a fixed number of reductions from gross salary. The reductions allow the employer to recoup the financial outlay of purchasing the equipment from Halfords."
  },

  // ============ ADMIN PROCESSES ============
  {
    category: "Admin Processes",
    question: "How do I download a scheme report?",
    keywords: ["download", "scheme", "report", "export", "excel"],
    answer: "For a scheme, go to new applications, select the dropdown for scheme, contains, and enter the name. Then click Export to Excel and the report will be downloaded. You can adjust what information is caught by adding or subtracting columns in the view."
  },
  {
    category: "Admin Processes",
    question: "I can't find an applicant on MAPS",
    keywords: ["find", "applicant", "maps", "can't find", "search", "locate"],
    answer: "Try using the email address as this is more specific - enter this into the email column in new applications under 'contains' and ensure that in the filter section of the search you make sure inactive is also selected as they may have cancelled. If this does not work, it is likely that the employee was never uploaded onto MAPS - request Agreement number for confirmation."
  },
  {
    category: "Admin Processes",
    question: "How do I upload an applicant to MAPS?",
    keywords: ["upload", "applicant", "maps", "add", "how"],
    answer: "Go to BP File upload, select new file, find account name, scheme and then drag and drop file onto the box."
  },
  {
    category: "Admin Processes",
    question: "Batch file isn't loading onto MAPS?",
    keywords: ["batch", "file", "loading", "maps", "not working", "upload", "error"],
    answer: "Check the batch file being used is a .csv file, then check for commas and apostrophes as this causes MAPS to trip up. If that doesn't work, check the scheme's window has not ended and there is not another account with the same name. Ensure you check the account name not the company name as this is what can cause the issue."
  },
  {
    category: "Admin Processes",
    question: "Employee uploaded but isn't being issued an LOC",
    keywords: ["employee", "uploaded", "not issued", "loc", "no loc", "missing"],
    answer: "Check if the company requires a hire agreement to be sent out first - it should be issued automatically if it is batch uploaded by us. Check it has not been rejected and if needs be, manually approve."
  },
  {
    category: "Admin Processes",
    question: "How do I know if an account is pro forma?",
    keywords: ["pro forma", "proforma", "check", "know", "account type"],
    answer: "It will say on the company page on MAPS - 'Is proforma? Yes'"
  },
  {
    category: "Admin Processes",
    question: "Why won't an account go through to registered?",
    keywords: ["account", "registered", "won't", "go through", "stuck"],
    answer: "Try removing the company registration and retrying. Sometimes the company will disappear when this happens, but try reinputting the company set up - this time ticking 'no' to if the company has a registration, and then once it is through, input the reg. Contact Owen if it still does not go through."
  },
  {
    category: "Admin Processes",
    question: "Company set up doesn't have a company reg",
    keywords: ["company", "set up", "registration", "no reg", "public"],
    answer: "Likely this is a public company, i.e. a school. Input 'no' to if it has a registration and then once setup, change to PUB[insertcompanyinitials]."
  },
  {
    category: "Admin Processes",
    question: "Company set up's address doesn't come up",
    keywords: ["company", "set up", "address", "doesn't come up", "not found"],
    answer: "This is common - select the nearest neighbour and then change it once the company is set up."
  },
  {
    category: "Admin Processes",
    question: "I can't find a password for a batch file",
    keywords: ["password", "batch file", "find", "can't find", "where"],
    answer: "Check the password sheet or contact the account manager to request this!"
  },
  {
    category: "Admin Processes",
    question: "Employee wants to change EOH option",
    keywords: ["employee", "change", "eoh", "end of hire", "option"],
    answer: "Contact the Customer Experience team as they might be able to change this!"
  },
  {
    category: "Admin Processes",
    question: "Employee requested a cancellation?",
    keywords: ["employee", "requested", "cancellation", "cancel"],
    answer: "Send this to the Customer Experience team as they will know best with this!"
  },
  {
    category: "Admin Processes",
    question: "How do I check for duplicates on batch file?",
    keywords: ["check", "duplicates", "batch file", "duplicate"],
    answer: "Use the 'Check for Duplicates' option when processing batch file and upload a scheme report from the company's current scheme."
  },
  {
    category: "Admin Processes",
    question: "Company's email isn't working on a set up",
    keywords: ["company", "email", "not working", "set up", "invalid"],
    answer: "Input noemail@halfords.co.uk and then change it to the correct address. Ensure you contact the client success team to inform them that they will need to issue the agreement documents to this company set up separately."
  },
  {
    category: "Admin Processes",
    question: "How do I know if a benefit provider sends out the hire agreement?",
    keywords: ["benefit provider", "hire agreement", "send", "who sends"],
    answer: "They will say 'Hire Agreement' if Halfords issues this, or 'No Hireagreement' if the BP does."
  },
  {
    category: "Admin Processes",
    question: "Where do I upload car maintenance?",
    keywords: ["upload", "car maintenance", "where", "salesforce"],
    answer: "Salesforce, Scheme Member Upload, Car Maintenance, company and scheme."
  },
  {
    category: "Admin Processes",
    question: "What is the car maintenance process?",
    keywords: ["car maintenance", "process", "how", "steps"],
    answer: "Download file, put into Batch Formatter and format as usual, tick Car Maintenance and download both files. Upload CSV to Salesforce account, upload SFTP to Wheelies Incoming. Download the Outgoing SFTP response and input the two numbers into the Salesforce applicants' applications LOR ID and Unsuccessful Reason."
  },
  {
    category: "Admin Processes",
    question: "What is the CSBounty process?",
    keywords: ["csbounty", "process", "bounty", "how"],
    answer: "Download file and input first name as 'A.' and the email as Noemail@halfords.co.uk - then once uploaded, get the LOC Number and input it in a new column titled 'LOC Number' for each applicant and upload it back to SFTP."
  }
];

/**
 * Get all unique categories
 */
export function getCategories() {
  return [...new Set(knowledgeBase.map(item => item.category))];
}

/**
 * Get questions by category
 */
export function getQuestionsByCategory(category) {
  return knowledgeBase.filter(item => item.category === category);
}
