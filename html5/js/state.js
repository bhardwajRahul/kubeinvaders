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
  const prefixes = ['astro', 'cosmo', 'space', 'star', 'nova', 'nebula', 'galaxy', 'super', 'hyper', 'quantum'];
  const suffixes = ['nova', 'tron', 'wave', 'core', 'pulse', 'jump', 'drive', 'ship', 'gate', 'hole'];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

  return prefix + suffix;
}

class GlobalState {
  constructor() {
    const spaceshipHeight = 60;
    const spaceshipWidth = 60;
    const namespaces = [];
    const namespaces_index = 0;

    this.state = {
      ballRadius: 7,
      x: canvas.width / 2,
      y: canvas.height - 30,
      dx: 2,
      dy: -2,
      spaceshipHeight: spaceshipHeight,
      spaceshipWidth: spaceshipWidth,
      spaceshipX: (canvas.width - spaceshipWidth) / 2,
      spaceshipY: (canvas.height - spaceshipHeight) / 2,
      clu_endpoint: "endpoint_placeholder",
      clu_insecure: "insecure_endpoint_placeholder",
      demo_mode: "demo_mode_placeholder",
      k8s_url: "",
      chaos_report_post_data: "",
      selected_env_vars: "selected_env_vars_placeholder",
      namespaces: namespaces,
      namespaces_index: namespaces_index,
      namespace: namespaces[namespaces_index],
      endpoint: "",
      modal_opened: false,
      autoPilot: false,
      autoPilotDirection: 0,
      randomFactor: 10,
      pods: [],
      game_mode_switch: false,
      programming_mode_switch: false,
      chaos_program_valid: false,
      log_tail_switch: false,
      log_tail_div: document.getElementById("logTailDiv"),
      log_tail_screen: document.getElementById("logTailScreen"),
      random_code: (Math.random() + 1).toString(36).substring(7),
      editor: null,
      kubeping_sent: false,
      maxAliensPerRow: 20,
      startYforHelp: 700,
      nodes: [],
      aliens: [],
      aliensWidth: 40,
      rightPressed: false,
      leftPressed: false,
      upPressed: false,
      downPressed: false,
      shot: false,
      rocketLaunched: false,
      rocketX: -400,
      rocketY: -400,
      rocketSpeed: 7,
      collisionDetected: false,
      aliensY: [],
      aliensIncrementY: 50,
      shuffle: true,
      help: false,
      chaos_nodes: false,
      chaos_pods: true,
      log_tail_alert: '<div id="alert_placeholder3" style="margin-top: 2%; margin-bottom: 1%; background-color: #161616; color: #ffffff" class="alert" role="alert">',
      log_tail_alert_no_pixel: '<div id="alert_placeholder3" style="margin-top: 2%; margin-bottom: 1%; background-color: #161616; color: #ffffff; font-family: Courier, monospace;" class="alert" role="alert">',
      alert_div: '<div id="alert_placeholder" style="margin-top: 2%; margin-bottom: 1%; background-color: #161616; color: #ffffff" class="alert" role="alert">',
      alert_div_webtail: '<div id="alert_placeholder3" style="margin-top: 2%; background-color: #161616; color: #ffffff" class="alert" role="alert">',
      kubelinter: '',
      showPodName: true,
      latestPodNameY: '',
      namespacesJumpFlag: false,
      namespacesJumpStatus: 'Disabled',
      latest_preset_name: "",
      latest_preset_lang: "",
      codename: getCodeName(),
      codename_regex: /chaos-codename:\ [a-zA-Z_]*/g,
      chaos_job_regex: /chaos_jobs_pod_phase.*/g,
      codename_configured: false,
      chaos_jobs_status: new Map(),
      current_color_mode: "light",
      chaos_logs_pos: 0,
      chaos_report_switch: false,
      chaos_report_http_elapsed_time_array: [],
      chaosReportprojectName: "",
      chaos_report_start_date: "",
      chart_deleted_pods_total: 0,
      chart_chaos_jobs_total: 0,
      chart_current_chaos_job_pod: 0,
      chart_pods_not_running_on: 0,
      chart_fewer_replicas_seconds: 0,
      chart_latest_fewer_replicas_seconds: 0,
      chart_status_code_dict: {
        "200": 1,
        "500": 1,
        "502": 1,
        "503": 1,
        "504": 1,
        "400": 1,
        "401": 1,
        "403": 1,
        "404": 1,
        "405": 1,
        "Connection Error": 1,
        "Other": 1
      },
    }
  }

  get(key) {
    return this.state[key];
  }

  set(key, value) {
    this.state[key] = value;
  }
}

// Creazione dell'istanza di GlobalState
var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

var editor_chaos_container_definition = CodeMirror.fromTextArea(currentChaosContainerJsonTextArea, {
  lineNumbers: true,
  theme: "dracula",
  mode: "javascript"
});

window.GlobalState = GlobalState;
const globalState = new window.GlobalState();

function printGlobalState() {
  for (const key in globalState.state) {
    if (globalState.state.hasOwnProperty(key)) {
      console.log(`${key}: ${globalState.state[key]}`);
    }
  }
}

printGlobalState();