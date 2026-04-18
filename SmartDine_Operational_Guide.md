# SmartDine-Pro: Operational Guide

This document explains exactly how your application runs, what happens when you turn off your computer, and how to update the system in the future.

---

## ☁️ 1. The Live Restaurant (Always On)
Because we deployed your application to **Firebase Cloud Hosting**, your app lives on Google's servers, not your personal laptop.

**Your Live URLs:**
* **Customer Menu:** [https://smartdine-pro.web.app](https://smartdine-pro.web.app)
* **Staff/Billing Console:** [https://smartdine-pro.web.app/staff.html](https://smartdine-pro.web.app/staff.html) *(PIN: 1234)*
* **Waiter/Service Panel:** [https://smartdine-pro.web.app/waiter.html](https://smartdine-pro.web.app/waiter.html)

**What to do before shutting down your laptop:**
* **Nothing!** You can shut down your laptop, disconnect from Wi-Fi, and go to sleep. 
* Customers can still scan QR codes on their mobile data and place orders.
* The chef can still use an iPad to see orders coming in.
* The cloud database and hosting run 24 hours a day, 7 days a week independently of your computer.

---

## 💻 2. Testing & Making Changes (Local Development)
When you want to edit the code (change colors, update the menu prices permanently in code, or add new features), you do this safely on your laptop *without* breaking the live website.

**How to start local development:**
1. Open up this project folder in Visual Studio Code.
2. Open the terminal (Terminal -> New Terminal).
3. Type the following command and press Enter:
   ```bash
   npm run dev
   ```
4. This starts a "fake" local version of your app at `http://localhost:5173`. You can safely code and test your changes here.

**How to stop local development:**
* When you are done writing code for the day, click inside the terminal and press **`Ctrl + C`** on your keyboard (Type `Y` if it asks to terminate). 
* *Note: This only stops your local testing server `localhost:5173`. It does not affect the live internet app.*

---

## 🚀 3. Pushing Changes to the Live Internet
Once you are happy with the code changes you made locally, you need to push them to the internet so your customers and staff can see them.

**Steps to Deploy:**
1. Ensure your terminal in VS Code is open.
2. Tell your computer to "package" the new code for the internet by running:
   ```bash
   npm run build
   ```
3. Push that packaged code to Firebase by running:
   ```bash
   npx firebase-tools deploy
   ```
4. Wait 10 seconds. Your live app at `smartdine-pro.web.app` is now updated globally!

---

## 📚 Summary Checklist

| Action | Command / Action | Does the laptop need to be on? |
| :--- | :--- | :--- |
| **Customers placing orders** | Go to `smartdine-pro.web.app` | **No** |
| **Chef checking active tickets** | Go to `staff.html#/kitchen` | **No** |
| **Editing the code locally** | Run `npm run dev` in VS Code | Yes |
| **Updating the live internet app** | Run `npm run build` then `npx firebase-tools deploy` | Yes (just during the push) |
| **End of the day** | Close VS Code and close your laptop lid | No |
