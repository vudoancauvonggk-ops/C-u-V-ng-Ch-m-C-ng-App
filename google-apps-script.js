/**
 * ETMS (Education Teacher Management System) Google Apps Script Backend Web App
 * 
 * Instructions:
 * 1. Open Google Sheets (https://sheets.google.com).
 * 2. Create a new Spreadsheet and note its Spreadsheet ID (from the URL).
 * 3. In the menu, go to Extensions -> Apps Script.
 * 4. Paste this code, replacing any default content.
 * 5. Ensure you have tabs named "Teachers", "Schools", "Classes", "Schedules", and "Attendance" 
 *    in your active Spreadsheet. (If some are missing, they will be auto-created upon first sync).
 * 6. Click "Deploy" -> "New deployment" -> Select type "Web app".
 * 7. Set configuration:
 *    - Description: ETMS Live API Backend
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone
 * 8. Authorize the Web App and copy the generated Web App URL.
 * 9. Paste this Web App URL into the ETMS Admin Dashboard "Cài Đặt Đồng Bộ Google Sheets" panel.
 */

// Handle GET requests (Read Data)
function doGet(e) {
  var action = e.parameter.action;
  var sheetId = e.parameter.sheetId;
  
  if (!sheetId) {
    return createJsonResponse({ status: "error", message: "Missing required 'sheetId' parameter." });
  }
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    
    if (action === "getTeachers") {
      return createJsonResponse({ status: "success", data: readSheetData(ss, "Teachers") });
    } else if (action === "getSchools") {
      return createJsonResponse({ status: "success", data: readSheetData(ss, "Schools") });
    } else if (action === "getClasses") {
      return createJsonResponse({ status: "success", data: readSheetData(ss, "Classes") });
    } else if (action === "getSchedules") {
      return createJsonResponse({ status: "success", data: readSheetData(ss, "Schedules") });
    } else if (action === "getAttendance") {
      return createJsonResponse({ status: "success", data: readSheetData(ss, "Attendance") });
    } else {
      // Get all core collections at once
      var payload = {
        status: "success",
        teachers: readSheetData(ss, "Teachers"),
        schools: readSheetData(ss, "Schools"),
        classes: readSheetData(ss, "Classes"),
        schedules: readSheetData(ss, "Schedules"),
        attendance: readSheetData(ss, "Attendance")
      };
      return createJsonResponse(payload);
    }
  } catch (err) {
    return createJsonResponse({ status: "error", message: "doGet failed: " + err.toString() });
  }
}

// Handle POST requests (Create, Update, Delete Data)
function doPost(e) {
  var postData;
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({ status: "error", message: "Invalid JSON post request body." });
  }
  
  var action = postData.action;
  var sheetId = postData.sheetId;
  var data = postData.data;
  
  if (!sheetId) {
    return createJsonResponse({ status: "error", message: "Missing required 'sheetId' in json body." });
  }
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var result = { status: "success" };
    
    if (action === "addTeacher") {
      appendRow(ss, "Teachers", data);
      result.message = "ADD_TEACHER_SUCCESS";
    } else if (action === "updateTeacher") {
      var ok = updateRow(ss, "Teachers", data, "id");
      if (!ok) {
        // Fallback: if not found, append
        appendRow(ss, "Teachers", data);
      }
      result.message = "UPDATE_TEACHER_SUCCESS";
    } else if (action === "deleteTeacher") {
      var deletedId = postData.id || (data && data.id);
      var ok = deleteRow(ss, "Teachers", deletedId, "id");
      if (!ok) {
        throw new Error("Teacher ID " + deletedId + " not found for deletion.");
      }
      result.message = "DELETE_TEACHER_SUCCESS";
    } else if (action === "addSchool") {
      appendRow(ss, "Schools", data);
      result.message = "ADD_SCHOOL_SUCCESS";
    } else if (action === "updateSchool") {
      updateRow(ss, "Schools", data, "id");
      result.message = "UPDATE_SCHOOL_SUCCESS";
    } else if (action === "addClass") {
      appendRow(ss, "Classes", data);
      result.message = "ADD_CLASS_SUCCESS";
    } else if (action === "updateClass") {
      updateRow(ss, "Classes", data, "id");
      result.message = "UPDATE_CLASS_SUCCESS";
    } else if (action === "addAttendance") {
      appendRow(ss, "Attendance", data);
      result.message = "ADD_ATTENDANCE_SUCCESS";
    } else if (action === "bulkSync") {
      // Fully replace current tabs with bulk system data
      if (postData.teachers) writeWholeSheet(ss, "Teachers", postData.teachers);
      if (postData.schools) writeWholeSheet(ss, "Schools", postData.schools);
      if (postData.classes) writeWholeSheet(ss, "Classes", postData.classes);
      if (postData.schedules) writeWholeSheet(ss, "Schedules", postData.schedules);
      if (postData.attendance) writeWholeSheet(ss, "Attendance", postData.attendance);
      result.message = "BULK_SYNC_SUCCESS";
    } else {
      return createJsonResponse({ status: "error", message: "Unsupported action: " + action });
    }
    
    return createJsonResponse(result);
  } catch (err) {
    return createJsonResponse({ status: "error", message: "doPost failed: " + err.toString() });
  }
}

// Create properly styled application/json output
function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
                       .setMimeType(ContentService.MimeType.JSON);
}

// Check for existing/auto-create Sheet Tabs
function getAndEnsureSheet(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }
  return sheet;
}

// Convert a table sheet into JSON objects list
function readSheetData(ss, tabName) {
  var sheet = getAndEnsureSheet(ss, tabName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow < 2 || lastCol < 1) return [];
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  
  var list = [];
  for (var r = 0; r < rows.length; r++) {
    var rawRow = rows[r];
    var obj = {};
    var emptyCount = 0;
    
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (key) {
        var val = rawRow[c];
        if (val === "" || val === undefined || val === null) {
          emptyCount++;
        }
        // Try parsing nested cells if they look like arrays/objects
        if (typeof val === "string" && (val.indexOf("[") === 0 || val.indexOf("{") === 0)) {
          try {
            val = JSON.parse(val);
          } catch (e) {}
        }
        obj[key] = val;
      }
    }
    
    if (emptyCount < headers.length) {
      list.push(obj);
    }
  }
  return list;
}

// Append or create a row in clean horizontal layout matching object headers
function appendRow(ss, tabName, obj) {
  var sheet = getAndEnsureSheet(ss, tabName);
  var headers = []; 
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow === 0 || lastCol === 0) {
    // Generate headers from object keys
    headers = Object.keys(obj);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // Check if there are any new fields to add to headers
    var keys = Object.keys(obj);
    var newHeadersAdded = false;
    keys.forEach(function(k) {
      if (headers.indexOf(k) === -1) {
        headers.push(k);
        newHeadersAdded = true;
      }
    });
    if (newHeadersAdded) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  
  // Create row arrays corresponding to headers
  var newRow = headers.map(function(h) {
    var val = obj[h];
    if (typeof val === "object" && val !== null) {
      return JSON.stringify(val);
    }
    return val !== undefined ? val : "";
  });
  
  sheet.appendRow(newRow);
}

// Update an existing row based on a primary key field (e.g. "id")
function updateRow(ss, tabName, obj, pKeyField) {
  var sheet = getAndEnsureSheet(ss, tabName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return false;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var pKeyIdx = headers.indexOf(pKeyField);
  if (pKeyIdx === -1) return false;
  
  var targetVal = obj[pKeyField];
  var ids = sheet.getRange(2, pKeyIdx + 1, lastRow - 1, 1).getValues();
  
  var rowToUpdate = -1;
  for (var r = 0; r < ids.length; r++) {
    if (String(ids[r][0]).trim() === String(targetVal).trim()) {
      rowToUpdate = r + 2; // offset header & index starting 0
      break;
    }
  }
  
  if (rowToUpdate === -1) return false;
  
  // Set values individual matching current headers
  var valuesRow = [[]];
  for (var c = 0; c < headers.length; c++) {
    var h = headers[c];
    var val = obj[h] !== undefined ? obj[h] : "";
    if (typeof val === "object" && val !== null) {
      val = JSON.stringify(val);
    }
    valuesRow[0].push(val);
  }
  
  sheet.getRange(rowToUpdate, 1, 1, headers.length).setValues(valuesRow);
  return true;
}

// Delete an existing row matching ID
function deleteRow(ss, tabName, idVal, pKeyField) {
  var sheet = getAndEnsureSheet(ss, tabName);
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return false;
  
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var pKeyIdx = headers.indexOf(pKeyField);
  if (pKeyIdx === -1) return false;
  
  var ids = sheet.getRange(2, pKeyIdx + 1, lastRow - 1, 1).getValues();
  for (var r = 0; r < ids.length; r++) {
    if (String(ids[r][0]).trim() === String(idVal).trim()) {
      sheet.deleteRow(r + 2);
      return true;
    }
  }
  return false;
}

// Fully replace the contents of a sheet tab with an array of objects
function writeWholeSheet(ss, tabName, listObj) {
  var sheet = getAndEnsureSheet(ss, tabName);
  sheet.clear();
  
  if (!listObj || listObj.length === 0) return;
  
  // Extract all unique headers
  var headersMap = {};
  listObj.forEach(function(x) {
    Object.keys(x).forEach(function(k) {
      headersMap[k] = true;
    });
  });
  var headers = Object.keys(headersMap);
  
  // Ensure id is always first if present
  var idIdx = headers.indexOf("id");
  if (idIdx > 0) {
    headers.splice(idIdx, 1);
    headers.unshift("id");
  }
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  var dataRows = listObj.map(function(obj) {
    return headers.map(function(h) {
      var val = obj[h];
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
      return val !== undefined ? val : "";
    });
  });
  
  sheet.getRange(2, 1, dataRows.length, headers.length).setValues(dataRows);
}
