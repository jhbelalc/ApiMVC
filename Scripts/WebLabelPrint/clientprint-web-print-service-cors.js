var _isClientPrintUpToDate = false;
var _expectedClientPrintVersionNumber = 2;

// Polls every 5 seconds until we receive a valid response from the client print service.
// At that point OnClientPrintLoad() is called.
function ClientPrintInitialize()
{  
   var isWorkingURL = 'http://localhost:8633/BarTenderWebPrintService/IsWorkingNoAuth?rand=' + Math.floor((Math.random()*10000)+1);
   var versionNumberURL = 'http://localhost:8633/BarTenderWebPrintService/GetVersionNumber?rand=' + Math.floor((Math.random()*10000)+1);

   $.ajax({
      type: 'GET',
      url: isWorkingURL,
      cache: false,
      dataType: 'json',
      xhrFields: {
         withCredentials: true
      },
      success: function(data){
         if (data == 'true' || data == true)
         {
            // Find the version and test if we need an update
            $.ajax({
               type: 'GET',
               url: versionNumberURL,
               contentType: 'text/plain',
               dataType: 'json',
               success: function(data) {
                  var versionNumber = parseInt(data, 10);
                  _isClientPrintUpToDate = versionNumber >= _expectedClientPrintVersionNumber;
               },
               error: function(jqXHR, textStatus) {
                  _isClientPrintUpToDate = false;
               },
               complete: function() {
                  OnClientPrintLoad();
               }
            });               
         }
         else
         {
            setTimeout(function() { ClientPrintInitialize() }, 5000);
         }
      },
      error: function(jqXHR, textStatus) {
         setTimeout(function() { ClientPrintInitialize() }, 5000);
      }
   });
}

// Enumerates client printers and fires the result in the specified callback.
function GetClientPrinters(callback)
{
   $.ajax({
      type: 'GET',
      url: "http://localhost:8632/BarTenderWebPrintService/GetClientPrinters?rand=" + Math.floor((Math.random()*10000)+1),
      cache: false,
      dataType: 'json',
      xhrFields: {
         withCredentials: true
      },
      success: function(data){
         callback(data);
      },
      error: function(jqXHR, textStatus) {
         alert(textStatus);
      }
   });
}

// Create a printer license for the specified printer. Fires callback after completion.
function CreatePrintLicense(printerInfo, callback)
{
   var url = "";
   if (printerInfo.ClientPrintType == "queue")
      url = 'http://localhost:8632/BarTenderWebPrintService/CreatePrintLicensePrintQueue?printerName=' + encodeURIComponent(printerInfo.PrinterName) +
            '&rand=' + Math.floor((Math.random()*10000)+1);
   else if (printerInfo.ClientPrintType == "port")
      url = 'http://localhost:8632/BarTenderWebPrintService/CreatePrintLicenseDirectPort?modelName=' + encodeURIComponent(printerInfo.ServerPrinterModelName) +
            '&portType=' + encodeURIComponent(printerInfo.PortType) +
            '&portValue=' + encodeURIComponent(printerInfo.PortValue) +
            '&rand=' + Math.floor((Math.random()*10000)+1); 
                              
   $.ajax({
      type: 'GET',      
      url: url,
      cache: false,
      dataType: 'json',
      xhrFields: {
         withCredentials: true
      },
      success: function(data){
         callback(data);
      },
      error: function(jqXHR, textStatus) {
         alert(textStatus);
      }
   });
}

// Prints the encoded print code to the printer or port specified. Fires callback after completion.
function ClientPrint(printerInfo, printCode, callback)
{
   var url = "";
   if (printerInfo.ClientPrintType == "queue")
      url = 'http://localhost:8632/BarTenderWebPrintService/PrintToPrintQueue?printerName=' + encodeURIComponent(printerInfo.PrinterName) +
            '&printJobNamePrefix=' + encodeURIComponent("Web Label Print SDK Example") +
            '&rand=' + Math.floor((Math.random()*10000)+1);
   else if (printerInfo.ClientPrintType == "port")
      url = 'http://localhost:8632/BarTenderWebPrintService/PrintToPort?portType=' + encodeURIComponent(printerInfo.PortType) +
            '&portValue=' + encodeURIComponent(printerInfo.PortValue) +
            '&rand=' + Math.floor((Math.random()*10000)+1); 

   $.ajax({
      type: 'POST',
      url: url,
      contentType: 'text/plain',
      dataType: 'json',
      xhrFields: {
         withCredentials: true
      },
      data: printCode,
      success: function(data){
         callback(data);
      },
      error: function(jqXHR, textStatus) {
         alert(textStatus);
      }
   });
}

// Returns true if the client print module can get extended printer information (model, port, location, etc)
function ClientPrintCanGetPrinterModel()
{
   return true;
}

// Returns true if the client print module can query printer and print job status
function ClientPrintCanGetPrinterStatus()
{
   return true;
}

function ClientPrintCanGetPorts()
{
   return true;
}

function ClientPrintIsUpdateNeeded()
{
   return !_isClientPrintUpToDate;
}

// Returns status information for the specified client printer queue. This is not individual job status, just conditions
// reported from the printer. Note that the status monitoring must be enabled inside the printer driver (not enabled by
// default) before we can get much actual information.
function ClientPrintGetPrinterStatus(printerName, callback)
{
   $.ajax({
      type: 'GET',
      url: "http://localhost:8632/BarTenderWebPrintService/GetPrinterStatus?printerName=" + encodeURIComponent(printerName) + "&rand=" + Math.floor((Math.random()*10000)+1),
      dataType: 'json',                     
      xhrFields: {
         withCredentials: true
      },
      success: function(data){
         callback(data);
      },
      error: function(jqXHR, textStatus) {
         alert(textStatus);
      }
   }); 
}

// Gets the status of a print job to a client printer queue with the specified job name. Fires the result in the specified
// callback.
function ClientPrintGetPrintJobStatus(jobName, callback)
{
   $.ajax({
      type: 'GET',
      url: "http://localhost:8632/BarTenderWebPrintService/GetPrintJobStatus?printJobName=" + encodeURIComponent(jobName) + "&rand=" + Math.floor((Math.random()*10000)+1),
      dataType: 'json',                     
      xhrFields: {
         withCredentials: true
      },
      success: function(data){
         callback(data);
      },
      error: function(jqXHR, textStatus) {
         alert(textStatus);
      }
   }); 
}

// Gets the COM and LPT ports available on the client. Fires the result in the specified callback.
function GetClientPorts(callback)
{
   $.ajax({
      type: 'GET',
      url: "http://localhost:8632/BarTenderWebPrintService/GetClientPorts?rand=" + Math.floor((Math.random()*10000)+1),
      cache: false,
      dataType: 'json',
      xhrFields: {
         withCredentials: true
      },
      success: function(data){
         callback(data);
      },
      error: function(jqXHR, textStatus) {
         alert(textStatus);
      }
   });
}