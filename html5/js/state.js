/*
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/*
This file contains the main JavaScript code for the KubeInvaders game.
It handles the initialization of the game, interaction with the Kubernetes cluster,
and various game functionalities such as chaos engineering actions, metrics retrieval,
and user interactions.
*/

function getCodeName() {
  var oReq = new XMLHttpRequest();
  oReq.onreadystatechange = function () {
      if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
          codename = this.responseText.trim();
          if (codename == "") {
              $('#alert_placeholder').replaceWith(alert_div + 'Error getting codename from backend. </div>');
              codename = "error_fix_getcodename_from_backend";
          }
      }
  };;
  oReq.open("GET", k8s_url + "/codename");
  oReq.send();
}

var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");
var ballRadius = 7;
var x = canvas.width/2;
var y = canvas.height-30;
var dx = 2;
var dy = -2;
var spaceshipHeight = 60;
var spaceshipWidth = 60;
var spaceshipX = (canvas.width-spaceshipWidth)/2;
var spaceshipY = (canvas.height-spaceshipHeight)/2;
var clu_endpoint = "endpoint_placeholder";
var clu_insicure = "insecure_endpoint_placeholder";
var demo_mode = "platform_engineering_demo_mode_placeholder"
var k8s_url = "";
var chaos_report_post_data = "";

// when zoomIn is 12
var maxAliensPerRow = 20;
var startYforHelp = 700;

if (clu_insicure == "true") {
    k8s_url = "http://" + clu_endpoint;
}
else {
    k8s_url = "https://" + clu_endpoint;
}

var namespaces = [];
var namespaces_index = 0;
var namespace = namespaces[namespaces_index];
var endpoint = "";
var modal_opened = false;
var autoPilot = false;
var autoPilotDirection = 0;
var spaceshipxOld = 0;
var randomFactor = 10;
// pods list from kubernetes
var pods = [];
var game_mode_switch = false;
var programming_mode_switch = false; 
var now = "";
var game_buttons = document.getElementById("game-buttons");
var game_screen = document.getElementById("game-screen");
var chaos_program_screen = document.getElementById("chaos-program-screen");
var programming_mode_buttons = document.getElementById("programming-mode-buttons");
var log_tail_switch = false;
var log_tail_div = document.getElementById("logTailDiv");
var log_tail_screen = document.getElementById("logTailScreen");
var random_code = (Math.random() + 1).toString(36).substring(7);

// nodes list from kubernetes
var nodes = [];

// Hash of aliens related to pods or nodes
var aliens = [];
var aliensWidth = 40;
var aliensHeight = 40;

// Button vars
var rightPressed = false;
var leftPressed = false;
var upPressed = false;
var downPressed = false;

// The is true the rocket can move
var shot = false;

// Keep track of rocket launch
var rocketLaunched = false;

// Rocket position
var rocketX = -400;
var rocketY = -400;
var rocketSpeed = 7;

var collisionDetected = false;

// Aliens Vars. Keep track of Y positions where there is an alien.
var aliensY = [];
var aliensIncrementY = 50;

var shuffle = true;
var help = false;
var chaos_nodes = false;
var chaos_pods = true;
var log_tail_alert = '<div id="alert_placeholder3" style="margin-top: 2%; margin-bottom: 1%; background-color: #161616; color: #ffffff" class="alert" role="alert">';
var log_tail_alert_no_pixel = '<div id="alert_placeholder3" style="margin-top: 2%; margin-bottom: 1%; background-color: #161616; color: #ffffff; font-family: Courier, monospace;" class="alert" role="alert">';

var alert_div = '<div id="alert_placeholder" style="margin-top: 2%; margin-bottom: 1%; background-color: #161616; color: #ffffff" class="alert" role="alert">';
var alert_div_webtail = '<div id="alert_placeholder3" style="margin-top: 2%; background-color: #161616; color: #ffffff" class="alert" role="alert">';
var kubelinter = '';
var showPodName = true
var latestPodNameY = '';
var namespacesJumpFlag = false;
var namespacesJumpStatus = 'Disabled';
var latest_preset_name = "";
var latest_preset_lang = "";
var codename = getCodeName();
const codename_regex = /chaos-codename:\ [a-zA-Z_]*/g;
const chaos_job_regex = /chaos_jobs_status.*/g;
var codename_configured = false;
var chaos_jobs_status = new Map();
var current_color_mode = "light";
var chaos_logs_pos = 0;
var chaos_report_switch = false;
var chaos_report_http_elapsed_time_array = [];
var chaosReportprojectName = "";
var chaos_report_start_date = "";
var chart_deleted_pods_total = 0;
var chart_chaos_jobs_total = 0;
var chart_current_chaos_job_pod = 0;
var chart_pods_not_running_on = 0;
var chart_fewer_replicas_seconds = 0;
var chart_latest_fewer_replicas_seconds = 0;
var chart_status_code_dict = {
    "200": 1,
    "500": 1,
    "502": 1,
    "503": 1,
    "504": 1,
    "400": 1,
    "401": 1,
    "403": 1,
    "404": 1,
    "Connection Error": 1,
    "Other": 1
};