$(document).ready(function(){
   /*
      Calls over to the appropriate client print module to begin initialization. Do this in jQuery's
      Document ready handler (or similar) to avoid DOM manipulation before the page has finished loading.
      After initialization has completed and the module is ready, the function called "OnClientPrintLoad()"
      will be executed. At this point you can interact with the client print module, and also do any UI to
      indicate that everything is ready.
   */
   ClientPrintInitialize();

   UpdatePrintGroupVisibility();
});

/*
   After the client print module has loaded successfully, this function will be called.
*/
function OnClientPrintLoad()
{
   if (ClientPrintIsUpdateNeeded())
   {
      $("#WebPrintServiceOutOfDateMessage").show();
      return;
   }   
   
   $("#ClientPrintNotReadyMessage").hide();
   
   // Get printers list and fill in the client printers list.
   GetClientPrinters(function(clientPrinters)
   {
      $("#SelectedClientPrinterName").empty();
      
      for (var i in clientPrinters)
      {
         $("#SelectedClientPrinterName").append('<option value="' + clientPrinters[i].PrinterName + '">' + clientPrinters[i].PrinterName + '</option>');
      }
      
      // If we've previously selected a client printer (page has reloaded from a form post), select the old printer now.
      $("#SelectedClientPrinterName").val($("#LastSelectedClientPrinterName").val());

      // When the page is re-rendered after a successful client or direct port print job, the hidden form field "ClientPrintCode" will
      // contain the code to send to the printer. We initiate the client print request when this field contains data. If printing to a client
      // printer, we do this at the end of the GetClientPrinters callback because we need to wait until the client printer's list has been
      // reloaded, so we know which printer to send the print code to. For direct-port print jobs, this happens after the ports list has been
      // reinitialized.
      var printType = $('input[name=PrintType]:checked').val();
      if (printType == "Client")
      {
         var clientPrintCode = $("#ClientPrintCode").val();
         if ((clientPrintCode != null) && (clientPrintCode != "") && (clientPrintCode.length > 0))
         {
            InitiateClientPrint(clientPrintCode);
         }
      }
   });
   
   // Get COM and LPT ports from the client and fill in the ports list. We can only do this from the Web Print Service. The Java module
   // doesn't support retrieving ports directly from the client, so there's a hard-coded list of default ports that are used instead.   
   if (ClientPrintCanGetPorts())
   {
      GetClientPorts(function(clientPorts)
      {
         InitializeClientPortsList(clientPorts);
      });
   }
   else
   {
      // We can't add ports directly from the client, so add some hard-coded default ports. In this case, we're adding
      // COM1 - COM4 and LPT1 - LPT3. The PortValue property here is the actual raw port name that we are sending data to.
      // In Windows, this is formatted as "COM1:" or "LPT2:". On Mac and Unix-platforms, this would be the raw device file,
      // e.g. "/dev/ttys0" for a COM port, or "/dev/lp0" for LPT ports.
      var ports = [];
      
      // COM1 - COM4
      for (var i = 1; i <= 4; i++)
         ports.push({Name: "COM" + i, PortType: "com", PortValue: "COM" + i + ":"});
      
      // LPT1 - LPT3
      for (var i = 1; i <= 3; i++)
         ports.push({Name: "LPT" + i, PortType: "lpt", PortValue: "LPT" + i + ":"});
      
      InitializeClientPortsList(ports);
   }
}

/*
   Fills in the ports list from the specified COM/LPT ports retrieved from the client, in addition to the IP Port option.
   Maintains the selection state from previous values.
*/
function InitializeClientPortsList(ports)
{
   // Add COM and LPT ports
   for (var i in ports)
   {
      var option = $('<option>').text(ports[i].Name).prop('value', JSON.stringify(ports[i]));         
      $("#SelectedDirectPort").append(option);
   }
   
   // IP Port 
   var ipPortValue = { Name: "TCP/IP Port", PortType: "ip", PortValue: "ip"}
   var ipPortOption = $('<option>').text(ipPortValue.Name).prop('value', JSON.stringify(ipPortValue));         
   $("#SelectedDirectPort").append(ipPortOption);
   
   // Select previous port used if available
   var isIPPortSelected = $("#IsIPPrinterSelected").val().toLowerCase() == "true";
   if (isIPPortSelected)
      $("#SelectedDirectPort").val(JSON.stringify(ipPortValue));
   else
      $("#SelectedDirectPort").val($("#SelectedDirectPortValue").val());
   
   UpdatePrintGroupVisibility();
   
   var printType = $('input[name=PrintType]:checked').val();
   if (printType == "DirectPort")
   {
      var clientPrintCode = $("#ClientPrintCode").val();
      if ((clientPrintCode != null) && (clientPrintCode != "") && (clientPrintCode.length > 0))
      {
         InitiateClientPrint(clientPrintCode);
      }
   }
}

/*
   Creates a print license for the selected client printer and then sets the hidden form field "ClientPrintLicense"
   with the value. Submits the print request if successful.
*/
function SetPrintLicenseAndPrint()
{
   var printType = $('input[name=PrintType]:checked').val();
   
   // No print license is needed for server printers, so just submit the form
   if (printType == "Server")
   {
      document.getElementById("PrintForm").submit();
      return;
   }
   
   // Get information about the printer to create a license. This is stored into a Javascript object.
   var printerInfo = CreateClientPrinterInfo();

   CreatePrintLicense(printerInfo, function(printLicenseInfo) {
      if (printLicenseInfo.Success) {
         $("#ClientPrintLicense").val(printLicenseInfo.PrintLicense);
         
         document.getElementById("PrintForm").submit();
      }
      else {
         alert("Failed to create print license for printer" + selectedClientPrinterName);
      }
   });
}

/*
   Sends the specified print code to the selected client printer.
*/
function InitiateClientPrint(printCode)
{
   var printerInfo = CreateClientPrinterInfo();
   
   ClientPrint(printerInfo, printCode, function(result) {
      if (result.Success){
         alert("successfully sent the print code to the client printer");
      }
      else {
         alert("an error occurred while sending the print code to the client printer. " + result.ErrorMessage);
      }      
   });
}

/*
   Selects a document by the specified container ID. This just gives the document cell a highlight color.
   It also sets the hidden form element containing the index of the selected document.
*/
function SelectDocument(id)
{
   // De-select existing documents -- remove the "activeDocument" class form each document
   $("#DocumentsListContainer").children('div').each(function() {
      $(this).removeClass("activeDocument");
   });
   
   // Select the current document -- add the "activeDocument" class to the selected ID
   $("#" + id).addClass("activeDocument");
   
   // Strip the "document_" from the ID so the form post value just contains the document index.
   $("#SelectedDocumentIndex").val(id.replace("document_", "")); 
}

/*
   Helper function to update the visibility of the UI groups depending on the current selection.
*/
function UpdatePrintGroupVisibility()
{
   $("#clientPrinterContainer").hide();
   $("#directPortContainer").hide();
   $("#directPortIPEntry").hide();
   
   switch ($('input[name=PrintType]:checked').val())
   {
      case "Client":
         $("#clientPrinterContainer").show();
      break;
      case "DirectPort":
         $("#directPortContainer").show();
         
         var selectedPortValue = $("#SelectedDirectPort").val();
         if ((typeof selectedPortValue != "undefined") && (selectedPortValue != null) && selectedPortValue.length)
         {
            var port = JSON.parse(selectedPortValue);
            if (port != null)
            {
               if (port.PortType == "ip")
               {
                  $("#directPortIPEntry").show();
               }
            }
         }
      break;
   }
}

/*
   Helper function to create a client printer info object depending on the current state of the controls.
   This is used for license creation and client printing.
*/
function CreateClientPrinterInfo()
{
   // ClientPrintType is set to "queue" when printing to client printers. You can also set this to "port" to
   // create a license for direct-port printing. 
   //
   // For direct port license creation and printing, generally just set the printerInfo's ClientPrintType to
   // "port", PortType to "com", "lpt", or "ip", and then the PortValue to the actual port name. For com or
   // lpt, that would be "COM1:" or "LPT2:" on Windows. For ip addresses, the | character delimits the address
   // and port number. For example, you can use a PortValue of "192.168.0.5|9100" for an IPv4 address.    
   var printerInfo = {};
   
   var printType = $('input[name=PrintType]:checked').val();
   
   if (printType == "Server")
      return printerInfo;
   
   printerInfo.ServerPrinterModelName = JSON.parse($("#SelectedServerPrinterName").val()).DriverName;

   if (printType == "Client")
   {
      var selectedClientPrinterName = $("#SelectedClientPrinterName").val();
      
      printerInfo.ClientPrintType = "queue";
      printerInfo.PrinterName = selectedClientPrinterName;
   }
   else if (printType == "DirectPort")
   {
      var selectedPort = JSON.parse($("#SelectedDirectPort").val());
      
      printerInfo.ClientPrintType = "port";
      printerInfo.PortType = selectedPort.PortType;
      
      if (printerInfo.PortType == "ip")
         printerInfo.PortValue = $("#DirectPortIPAddress").val() + "|" + $("#DirectPortPortNumber").val();
      else
         printerInfo.PortValue = selectedPort.PortValue;
   }
   
   return printerInfo;
}