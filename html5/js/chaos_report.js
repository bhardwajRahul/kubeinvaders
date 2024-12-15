function sendSavedChaosReport() {
  var presetBodyDict = {
    "chaosReportAuthor": $("#chaosReportAuthor").val(),
    "chaosReportProject": $("#chaosReportProject").val(),
    "chaosReportCheckSiteURL": $("#chaosReportCheckSiteURL").val(),
    "chaosReportCheckSiteURLMethod": $("#chaosReportCheckSiteURLMethod").val(),
    "chaosReportCheckSiteURLHeaders": $("#chaosReportCheckSiteURLHeaders").val(),
    "chaosReportCheckSiteURLPayload": globalState.get('chaos_report_post_data')
  }

  if (!isValidURL(presetBodyDict["chaosReportCheckSiteURL"])) {
    alert("Invalid URL");
    return;
  }

  if (globalState.get('chaos_report_start_date') == "") {
    globalState.set('chaos_report_start_date', new Date());
  }

  globalState.set('chaos_report_switch', true);
  document.getElementById("httpStatsCanvasDiv").style.display = "block";
  document.getElementById("chartDiv").style.display = "block";

  drawCanvasHTTPStatusCodeStats();

  chaosReportprojectName = presetBodyDict["chaosReportProject"];
  $("#chaosReportAuthorDiv").html(presetBodyDict["chaosReportAuthor"]);
  $("#chaosReportProjectDiv").html(presetBodyDict["chaosReportProject"]);
  $("#chaosReportDateDiv").html(globalState.get('chaos_report_start_date').toLocaleString());
  $("#chaosReportSessionTimeDiv").html(diffBetweenTwoDates(globalState.get('chaos_report_start_date'), new Date()) + " seconds");
  $("#chaosReportCheckSiteURLDiv").html(presetBodyDict["chaosReportCheckSiteURL"]);

  if (headerAreLikePythonRequestHeaders(presetBodyDict["chaosReportCheckSiteURLHeaders"]) == false) {
    alert("Invalid headers. Insert them like this: \"Content-Type\": \"application/json; charset=utf-8\";\"Authorization\"");
    return;
  }

  if (presetBodyDict["chaosReportCheckSiteURLMethod"] == "POST" && presetBodyDict["chaosReportCheckSiteURLPayload"] == undefined) {
    alert("Please upload a file for POST method");
    return;
  }

  if (checkIfSomeItemIsEmpty(presetBodyDict, "chaosReportCheckSiteURLPayload")) {
    alert("Please fill all fields");
    return;
  }

  var oReq = new XMLHttpRequest();
  oReq.open("POST", k8s_url + "/chaos/report/save?project=" + $("#chaosReportProject").val(), true);

  oReq.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      // console.log("[SAVE-CHAOS-REPORT-CONF] Configuration sent to Nginx")
    }
  };

  oReq.setRequestHeader("Content-Type", "application/json");
  oReq.send(JSON.stringify(presetBodyDict));
  closePrepareChaosReportModal();
  resizeCharts();
  document.getElementById("myCanvas").scrollIntoView(true);
  document.getElementById("flagChaosReport").checked = true;
  $('#alert_placeholder').replaceWith(alert_div + 'RETURN TO TOP, PRESS START TO BEGIN AUTOMATIC SESSION </div>');
}

function readContentOfUploadedFile() {
  var file = document.getElementById("formFile").files[0];
  var reader = new FileReader();
  reader.onload = function (e) {
    globalState.set('chaos_report_post_data', e.target.result);
    sendSavedChaosReport();
  };
  reader.readAsText(file);
}

function saveChaosReport() {
  if ($("#chaosReportCheckSiteURLMethod").val() == "POST") {
    readContentOfUploadedFile();
  } else {
    sendSavedChaosReport();
  }
}

function updateElapsedTimeArray(projectName) {
  $("#chaosReportSessionTimeDiv").html(diffBetweenTwoDates(globalState.get('chaos_report_start_date'), new Date()) + " seconds");

  var oReq = new XMLHttpRequest();
  var redis_key = projectName + "_check_url_elapsed_time";

  oReq.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      var elapsedTimeArray = globalState.get('chaos_report_http_elapsed_time_array');
      elapsedTimeArray.push(parseFloat(this.responseText));
      while (elapsedTimeArray.length > 40) {
        elapsedTimeArray.shift();
      }
      globalState.set('chaos_report_http_elapsed_time_array', elapsedTimeArray);
    }
  };

  oReq.open("GET", k8s_url + "/chaos/redis/get?key=" + redis_key, true);
  oReq.setRequestHeader("Content-Type", "application/json");
  oReq.send();
  updateStatusCodePieChart(projectName);
}

function updateStatusCodePieChart(projectName) {
  var oReq = new XMLHttpRequest();
  var redis_key = projectName + "_check_url_status_code";

  oReq.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      var status_code = this.responseText.trim();
      var statusCodeDict = globalState.get('chart_status_code_dict');
      statusCodeDict[status_code] = statusCodeDict[status_code] + 1;
      globalState.set('chart_status_code_dict', statusCodeDict);

      myHTTPStatusCodeChart.setOption({
        series: [
          {
            type: 'pie',
            data: [
              {
                value: statusCodeDict["200"],
                name: '200',
                itemStyle: { color: 'green' },
              },
              {
                value: statusCodeDict["500"],
                name: '500',
                itemStyle: { color: 'red' },
              },
              {
                value: statusCodeDict["502"],
                name: '502',
                itemStyle: { color: 'red' },
              },
              {
                value: statusCodeDict["503"],
                name: '503',
                itemStyle: { color: 'red' },
              },
              {
                value: statusCodeDict["504"],
                name: '504',
                itemStyle: { color: 'red' },
              },
              {
                value: statusCodeDict["400"],
                name: '400',
                itemStyle: { color: 'yellow' },
              },
              {
                value: statusCodeDict["401"],
                name: '401',
                itemStyle: { color: 'yellow' },
              },
              {
                value: statusCodeDict["403"],
                name: '403',
                itemStyle: { color: 'yellow' },
              },
              {
                value: statusCodeDict["404"],
                name: '404',
                itemStyle: { color: 'yellow' },
              },
              {
                value: statusCodeDict["Connection Error"],
                name: 'Connection Error',
                itemStyle: { color: 'black' },
              },
              {
                value: statusCodeDict["Other"],
                name: 'Other',
                itemStyle: { color: 'grey' },
              },
            ],
            radius: ['40%', '70%']
          }
        ]
      });
    }
  };

  oReq.open("GET", k8s_url + "/chaos/redis/get?key=" + redis_key, true);
  oReq.setRequestHeader("Content-Type", "application/json");
  oReq.send();
}

function drawCanvasHTTPStatusCodeStats() {
  myHTTPElapsedChart.setOption({
    xAxis: {},
    yAxis: {
      data: globalState.get('chaos_report_http_elapsed_time_array'),
    },
    series: [
      {
        data: globalState.get('chaos_report_http_elapsed_time_array'),
        type: 'line',
        smooth: true
      }
    ]
  });
}
