"use strict";
 /**
  * Author: Yitong Phou 
  * load setup to html
  */
 //main work for each case
    $(function () {

        $.get("setup/setup.txt", function (responseTxt, statusTxt, jqXHR) {
             if (statusTxt == "success") {
                  $("#preSetup").text(responseTxt);
             }
             if (statusTxt == "error") {
                  alert("Error: " + jqXHR.status + " " + jqXHR.statusText);
             }
        });

        $.get("assets/css/brandColor.css", function (responseTxt, statusTxt, jqXHR) {
             if (statusTxt == "success") {
                  $("#cssbrandColor").text(responseTxt);
             }
             if (statusTxt == "error") {
                  alert("Error: " + jqXHR.status + " " + jqXHR.statusText);
             }
        });
        $.get("assets/js/initBrandColor.js", function (responseTxt, statusTxt, jqXHR) {
             if (statusTxt == "success") {
                  $("#initBrandColor").text(responseTxt);
             }
             if (statusTxt == "error") {
                  alert("Error: " + jqXHR.status + " " + jqXHR.statusText);
             }
        });
   });
