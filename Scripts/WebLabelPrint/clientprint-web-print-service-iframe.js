var _getClientPrintersCallbacks = [];
var _isInGetClientPrinters = false;

var _getPrinterStatusCallback = null;
var _getPrintJobStatusCallback = null;
var _getClientPortsCallback = null;
var _createPrintLicenseCallback = null;
var _clientPrintCallback = null;
var _clientPrintReady = false;

var _isClientPrintUpToDate = false;
var _expectedClientPrintVersionNumber = 2;

// Format string function
if (!String.format) {
  String.format = function(format) {
    var args = Array.prototype.slice.call(arguments, 1);
    return format.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number] 
        : match
      ;
    });
  };
}

// Receives messages from the client print iframe, fires off callback(s) with results
function MessageListener(event)
{
   var message = JSON.parse(event.data);
   switch (message.request)
   {
      case "isReady":      
      {
         if (message.value == true)
         {
            if (!_clientPrintReady)
               OnWcfSuccessfulLoad();
         }
         break;
      }
      case "getClientPrinters":
      {
         for (var i in _getClientPrintersCallbacks)
         {
            _getClientPrintersCallbacks[i](message.value);
         }
         _getClientPrintersCallbacks = [];
         _isInGetClientPrinters = false;
         break;
      }
      case "getClientPorts":
      {
         _getClientPortsCallback(message.value);
         break;
      }
      case "createPrintLicense":
      {
         _createPrintLicenseCallback(message.value);
         break;
      }
      case "clientPrint":
      {
         _clientPrintCallback(message.value);
         break;
      }
      case "getPrinterStatus":
      {
         _getPrinterStatusCallback(message.value);
         break;
      }
      case "getPrintJobStatus":
      {
         _getPrintJobStatusCallback(message.value);
         break;
      }
   }
}

// Called to initialize the client print module. Basically the idea is to register the event listener for messages
// from the client print iframe, and loop sending "isready" messages until we get a response back.
function ClientPrintInitialize()
{  
   // Create postmessage event listener
   if (window.addEventListener){
      addEventListener("message", MessageListener, false);
   }
   else {
      attachEvent("onmessage", MessageListener);
   }
   
   var iframe = document.getElementById('BarTenderWebPrintServiceIframe');      
   var iframeContentWindow = iframe.contentWindow;
   iframe.onload = function()
   {
      var message = {
         request: "isReady"
      };
      
      iframeContentWindow.postMessage(JSON.stringify(message), "*");
   }
   
   PollClientPrintIframeUntilReady();
}

// AJAXs "isReady" messages to the client print service until we get a successful result back. Use the NoAuthentication version
// to avoid issues with older browsers lacking support for authenticating over CORS. When we get a successful response back, we
// reload the HTML and JS inside the client print iframe. The reload occurs to handle the case where the page has been loaded
// before the service has been installed or started. In that case, the original iframe contents are likely a browser's 404 page.
function PollClientPrintIframeUntilReady()
{
   var isWorkingURL = 'http://localhost:8633/BarTenderWebPrintService/IsWorkingNoAuth?rand=' + Math.floor((Math.random()*10000)+1);
   var versionNumberURL = 'http://localhost:8633/BarTenderWebPrintService/GetVersionNumber?rand=' + Math.floor((Math.random()*10000)+1);
   
   if (!_clientPrintReady)
   {
      $.ajax({
         type: 'GET',
         url: isWorkingURL,
         contentType: 'text/plain',
         dataType: 'json',
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
                     if (!_clientPrintReady)
                        ReloadClientPrintIframe();
                  }
               });               
            }
            else
            {
               setTimeout(function() {PollClientPrintIframeUntilReady()}, 5000);
            }
         },
         error: function(jqXHR, textStatus) {
            setTimeout(function() {PollClientPrintIframeUntilReady()}, 5000);
         }
      }); 
   }
}

// Reloads the HTML/JS inside the client printing iframe. This should only happen after we've established successful AJAX
// communication with the service.
function ReloadClientPrintIframe()
{
   var iframeContainer = document.getElementById('BarTenderWebPrintServiceIframeContainerDiv');
   var url = 'http://localhost:8632/BarTenderWebPrintService/Landing?rand=' + Math.floor((Math.random()*10000)+1); 
   iframeContainer.innerHTML = '<iframe src="' + url + '" id="BarTenderWebPrintServiceIframe" width="100%" height="20px" />';
   
   setTimeout(function() {      
      var iframe = document.getElementById('BarTenderWebPrintServiceIframe');
      var iframeContentWindow = iframe.contentWindow;
      
      var message = {
         request: "isReady"
      };
      iframeContentWindow.postMessage(JSON.stringify(message), "*");
   }, 500);
}


// Called after the client print module has successfully been initialized
function OnWcfSuccessfulLoad()
{
   _clientPrintReady = true;   

   OnClientPrintLoad();
}

// Enumerates client printers and fires the result in the specified callback.
function GetClientPrinters(callback)
{
   _getClientPrintersCallbacks.push(callback);
   
   if (!_isInGetClientPrinters)
   {   
      _isInGetClientPrinters = true;
      var iframe = document.getElementById("BarTenderWebPrintServiceIframe");
      var iframeContentWindow = iframe.contentWindow;
      var message = {
            request: "getClientPrinters"
         };
         
      iframeContentWindow.postMessage(JSON.stringify(message), "http://localhost:8632/BarTenderWebPrintService");
   }
}

// Create a printer license for the specified printer. Fires callback after completion.
function CreatePrintLicense(printerInfo, callback)
{
   _createPrintLicenseCallback = callback;
   
   var iframe = document.getElementById("BarTenderWebPrintServiceIframe");
   var iframeContentWindow = iframe.contentWindow;
   var message = {
         request: "createPrintLicense",
         printer: printerInfo
      };
      
   iframeContentWindow.postMessage(JSON.stringify(message), "http://localhost:8632/BarTenderWebPrintService");
}

// Prints the encoded print code to the printer specified. Fires callback after completion.
function ClientPrint(printerInfo, printCode, callback)
{
   _clientPrintCallback = callback;
   
   var iframe = document.getElementById("BarTenderWebPrintServiceIframe");
   var iframeContentWindow = iframe.contentWindow;
   var message = {
         request: "clientPrint",
         printer: printerInfo,
         printJobNamePrefix: "Web Label Print SDK Example",
         printCode: printCode
      };
      
   iframeContentWindow.postMessage(JSON.stringify(message), "http://localhost:8632/BarTenderWebPrintService");
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
   _getPrinterStatusCallback = callback;
   
   var iframe = document.getElementById("BarTenderWebPrintServiceIframe");
   var iframeContentWindow = iframe.contentWindow;
   var message = {
         request: "getPrinterStatus",
         printerName: printerName,
      };
      
   iframeContentWindow.postMessage(JSON.stringify(message), "http://localhost:8632/BarTenderWebPrintService");
}

// Gets the status of a print job to a client printer queue with the specified job name. Fires the result in the specified
// callback.
function ClientPrintGetPrintJobStatus(jobName, callback)
{
   _getPrintJobStatusCallback = callback;
   
   var iframe = document.getElementById("BarTenderWebPrintServiceIframe");
   var iframeContentWindow = iframe.contentWindow;
   var message = {
         request: "getPrintJobStatus",
         jobName: jobName,
      };
      
   iframeContentWindow.postMessage(JSON.stringify(message), "http://localhost:8632/BarTenderWebPrintService");
}

// Gets the COM and LPT ports available on the client. Fires the result in the specified callback.
function GetClientPorts(callback)
{
   _getClientPortsCallback = callback;
   
   var iframe = document.getElementById("BarTenderWebPrintServiceIframe");
   var iframeContentWindow = iframe.contentWindow;
   var message = {
         request: "getClientPorts",
      };
      
   iframeContentWindow.postMessage(JSON.stringify(message), "http://localhost:8632/BarTenderWebPrintService");
}