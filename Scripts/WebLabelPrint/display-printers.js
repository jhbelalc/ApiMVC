/*
   Calls over to the appropriate client print module to begin initialization. Do this in jQuery's
   Document ready handler (or similar) to avoid DOM manipulation before the page has finished loading.
   After initialization has completed and the module is ready, the function called "OnClientPrintLoad()"
   will be executed. At this point you can interact with the client print module, and also do any UI to
   indicate that everything is ready.
*/   
$(document).ready(function(){
   ClientPrintInitialize();
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
   
   // Get printers list and fill in the UI table. Note that only the Web Print Service is able to return extended information
   // about printers (model, location, port), and this is unsupported in the Java print client. This is determined by the
   // ClientPrintCanGetPrinterModel() function.
   GetClientPrinters(function(clientPrinters)
   {
      for (var i in clientPrinters)
      {
         var printerRow = '<tr>' +
                          '<td>' + clientPrinters[i].PrinterName + '</td>' +
                          '<td>' + (ClientPrintCanGetPrinterModel() ? clientPrinters[i].ModelName : 'Unknown') + '</td>' +
                          '<td>' + (ClientPrintCanGetPrinterModel() ? clientPrinters[i].Location : 'Unknown') + '</td>' +
                          '<td>' + (ClientPrintCanGetPrinterModel() ? clientPrinters[i].PortValue : 'Unknown') + '</td>' +
                          '<td>' + clientPrinters[i].IsDefault +   '</td>' +
                          '</tr>';
         
         $('#DisplayPrinters_ClientPrintersTable > tbody:last').append(printerRow);
      }
   });
}