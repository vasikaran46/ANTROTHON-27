/**
 * ANTROTHON'27 — GOOGLE APPS SCRIPT DRIVE UPLOADER
 * 
 * Paste this entire script into your Google Apps Script editor at:
 * https://script.google.com/
 * 
 * =====================================================================
 * STEP-BY-STEP DEPLOYMENT INSTRUCTIONS:
 * =====================================================================
 * 1. Open your Apps Script project (signed in as iicpatrician@patriciancollege.ac.in).
 * 2. Delete any existing code in Code.gs and paste this ENTIRE code.
 * 3. IMPORTANT: From the function dropdown at the top, select "testUpload" and click "Run".
 *    - Google will prompt: "Authorization Required".
 *    - Click "Review Permissions" -> Select your account -> Click "Advanced" -> Click "Go to Untitled project (unsafe)" -> Click "Allow".
 *    - Check the Execution Log at the bottom: You should see "SUCCESS: Test file created in Drive: ..."
 * 4. Now Deploy the Web App:
 *    - Click the blue "Deploy" button (top right) -> "Manage deployments".
 *    - Click the pencil (Edit) icon next to your active deployment.
 *    - Under "Version", select "New version" (DO NOT skip this; otherwise it runs old code!).
 *    - Ensure "Execute as" is set to "Me (iicpatrician@patriciancollege.ac.in)".
 *    - Ensure "Who has access" is set to "Anyone".
 *    - Click "Deploy".
 * 5. Copy the Web app URL (ends in /exec) and verify it matches GOOGLE_DRIVE_WEBHOOK_URL in your .env.
 */

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "Empty or invalid POST body received." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = JSON.parse(e.postData.contents);
    var filename = data.filename || ("ANTROTHON_Upload_" + new Date().getTime() + ".pptx");
    var mimeType = data.mimeType || "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    var base64Data = data.base64;
    var folderId = data.folderId;

    if (!base64Data) {
      return ContentService
        .createTextOutput(JSON.stringify({ success: false, error: "No base64 file data provided." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Decode base64 to Blob
    var decoded = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(decoded, mimeType, filename);

    // Locate target Drive folder (or fallback to root Drive if ID is invalid or missing)
    var folder = null;
    if (folderId) {
      try {
        folder = DriveApp.getFolderById(folderId);
      } catch (fErr) {
        // Fallback: If folder is not found or inaccessible, use Root
        folder = DriveApp.getRootFolder();
      }
    } else {
      folder = DriveApp.getRootFolder();
    }

    // Create file
    var file = folder.createFile(blob);

    // Set public view permissions so evaluation jury can open it
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      // Non-fatal if organizational policy restricts public sharing
    }

    var result = {
      success: true,
      id: file.getId(),
      url: file.getUrl(),
      filename: file.getName(),
      size: file.getSize(),
      folderId: folder.getId(),
      folderName: folder.getName(),
      version: "2.1"
    };

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: err.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "online",
      version: "2.1",
      service: "ANTROTHON'27 Multi-Folder Google Drive Webhook",
      timestamp: new Date().toISOString()
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * ONE-CLICK TEST & PERMISSION AUTHORIZATION FUNCTION
 * Run this function once in the editor to grant DriveApp permissions!
 */
function testUpload() {
  var testContent = "ANTROTHON'27 Test Probe - Authorization Success!";
  var blob = Utilities.newBlob(testContent, "text/plain", "ANTROTHON_Auth_Test.txt");
  
  // Replace with your folder ID or leave empty to test in root
  var folderId = "11SqDrgMl6Am3v5ObghmzkUo_UCotAnYb";
  var folder = null;
  try {
    folder = DriveApp.getFolderById(folderId);
  } catch (e) {
    folder = DriveApp.getRootFolder();
  }
  
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log("SUCCESS: Test file created in Drive: " + file.getUrl());
}
