// Called to initialize the client print module
function ClientPrintInitialize()
{   
   // Create and start applet. Applet tag is deprecated but more compatible  
   var applet = document.createElement('applet');
   applet.id = "BarTenderPrintClient";
   applet.codeBase=$("#ClientComponentsPath").val();
   applet.archive="BarTenderPrintClient.jar";
   applet.code="BarTenderPrintClient.class";
   applet.width="1px";
   applet.height="1px";
   applet.style="visibility:hidden;";
   applet.mayscript = true;   
   
   document.getElementsByTagName('body')[0].appendChild(applet);
      
   /*
   // HTML5 version. Not compatible with IE < 10.
   var applet = document.createElement('object');
   applet.setAttribute('id','BarTenderPrintClient');
   applet.setAttribute('type','application/x-java-applet');
   applet.setAttribute('width','1px');
   applet.setAttribute('height','1px');   
   var p1 = document.createElement('param');
   p1.setAttribute('name','codebase');
   p1.setAttribute('value',$('#ClientComponentsPath').val());
   applet.appendChild(p1);
   var p2 = document.createElement('param');
   p2.setAttribute('name','archive');
   p2.setAttribute('value','BarTenderPrintClient.jar');
   applet.appendChild(p2);
   var p3 = document.createElement('param');
   p3.setAttribute('name','code');
   p3.setAttribute('value','BarTenderPrintClient.class');
   applet.appendChild(p3);
   var p4 = document.createElement('param');
   p4.setAttribute('name','mayscript');
   p4.setAttribute('value','true');
   applet.appendChild(p4);   
   document.body.appendChild(applet);
   */
}

// Called after the Java applet has loaded
function OnJavaClientLoad()
{
   OnClientPrintLoad();
}

// Returns an array of printer objects. Contains the following fields:
// PrinterName (required): The printer name
// DisplayName (required): The printer name
// Source (required): "client" for a client printer.
// ClientPrintType (required): "queue" for a client printer.
// PortType (required): "auto" for a client's print queue
// IsDefault (required): True if it is the default printer.
// Model (optional): The printer's model name
// PortValue (optional): The printer's port name
// Location (optional): The printer's location
function GetClientPrinters(callback)
{
   var applet = document.getElementById("BarTenderPrintClient");
   var printerNames = applet.GetPrinterNames().split('\n');
   var defaultPrinterName = applet.GetDefaultPrinterName();
   
   var printers = []; 
   for (var i in printerNames)
   {
      var clientPrinter = {
         PrinterName: printerNames[i],
         DisplayName: printerNames[i],
         IsDefault: (printerNames[i] == defaultPrinterName),
         Source: "client",
         ClientPrintType: "queue",
         PortType: "auto"
      };
      
      // Java does not provide the ability to get printer's model, location, and port
      
      printers[i] = clientPrinter;
   }
   
   callback(printers);
}

// Creates a print license for the specified printer
// Returns the print license as a string
function CreatePrintLicense(printerInfo, callback)
{
   var applet = document.getElementById("BarTenderPrintClient");
   var printLicense = "";
   
   // Client print queue
   if (printerInfo.ClientPrintType == "queue")
   {
      var printerName = printerInfo.PrinterName;
      var printerModel = printerInfo.ServerPrinterModelName;
      var portName = "Unknown";
      
      printLicense = applet.GetPrintLicense(printerName, portName, printerModel);
   }
   else if (printerInfo.ClientPrintType == "port")
   {
      var printerName = printerInfo.ServerPrinterModelName;
      var printerModel = printerInfo.ServerPrinterModelName;
      
      if (printerInfo.PortType == "ip")
      {
         // IP Printer
         var portParts = printerInfo.PortValue.split('|');
         printLicense = applet.GetPrintLicenseForTCPPrinter(printerName, portParts[0], portParts[1], printerModel);
      }
      else
      {
         printLicense = applet.GetPrintLicense(printerName, printerInfo.PortValue, printerModel);
      }
   }
   
   var printLicenseInfo = {
      PrintLicense: printLicense,
      ErrorMessage: "",
      Success: (printLicense.length > 0)
   };
   
   callback(printLicenseInfo);
}

// Sends the specified print code to either the client's printer or port
//
// Performs the specified callback function upon completion with success status and an error message if failure.
function ClientPrint(printerInfo, printCode, callback)
{
   var applet = document.getElementById("BarTenderPrintClient");   
   var result = "";
   
   // Client print queue
   if (printerInfo.ClientPrintType == "queue")
   {
      var printerName = printerInfo.PrinterName;
      var printerModel = printerInfo.ServerPrinterModelName;
      
      result = applet.Print(printerName, printerModel, "Web Label Print SDK Example", printCode);      
   }
   else if (printerInfo.ClientPrintType == "port")
   {
      var printerName = printerInfo.ServerPrinterModelName;
      var printerModel = printerInfo.ServerPrinterModelName;
      
      if (printerInfo.PortType == "ip")
      {
         // IP Printer
         var portParts = printerInfo.PortValue.split('|');
         var ipAddr = portParts[0];
         var portNumber = 0;
         if (portParts.length > 1)
         {
            portNumber = parseInt(portParts[1], 10);
            if (isNaN(portNumber))
               portNumber = 0;
         }
         try
         {
            result = applet.PrintToIP(ipAddr, portNumber, printerModel, printCode);
         }
         catch (error)
         {
            if ((typeof error == "undefined") || (error == null) || (typeof error.message == "undefined") || (error.message == null) || (error.message.length == 0))
               result = "An unknown error occurred while printing to IP Address " + ipAddr + " on port " + portParts[1];
            else
               result = error.message;
         }
      }
      else
      {
         result = applet.PrintToPort(printerInfo.PortValue, printerModel, printCode);
      }
   }
   
   var success = (result == null) || (result == "");
   
   var printResult = {
      Success: success,
      ErrorMessage: result
   };
   
   callback(printResult);
}

function ClientPrintCanGetPrinterModel()
{
   return false;
}

function ClientPrintCanGetPrinterStatus()
{
   return false;
}

function ClientPrintCanGetPorts()
{
   return false;
}

function ClientPrintIsUpdateNeeded()
{
   return false;
}

function GetClientPorts(callback)
{
   // Java does not support getting client ports
   var ports = [];
   callback(ports);
}