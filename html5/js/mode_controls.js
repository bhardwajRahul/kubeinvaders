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

function startGameMode() {
  let game_buttons = document.getElementById("game-buttons");
  let game_screen = document.getElementById("game-screen");
  if (globalState.get('game_mode_switch')) {
    globalState.set('game_mode_switch', false);
    $("#gameModeButton").text("Enable Game Mode");
  } else {
    /* TO DO: DO BETTER :D */
    let checkbox = {
      checked: true,
    };
    let close_button = document.getElementById("closeButtonReport");
    close_button.innerHTML = "Skip";
    showPrepareChaosReportModal(checkbox);
    globalState.set('game_mode_switch', true);
    document.getElementById("gameContainer").style.width = "100%";
    document.getElementById("gameContainer").style.height = "100%";
    //document.getElementById("loadButtonGroup").style.width = "650px";
    $("#gameModeButton").text("Disable Game Mode");
    $("#programmingModeButton").text("Enable Prog. Mode");
    globalState.set('programming_mode_switch', false);
  }
  if (globalState.get('game_buttons_display') === "none") {
    globalState.set('game_buttons_display', "block");
    game_buttons.style.display = "block";
    } else {
    globalState.set('game_buttons_display', "none");
    game_buttons.style.display = "none";
  }
  if (globalState.get('game_screen_display') === "none") {
    globalState.set('game_screen_display', "block");
    game_screen.style.display = "block";
  } else {
    globalState.set('game_screen_display', "none");
    game_screen.style.display = "none";
  }
  globalState.set('chaos_program_screen_display', "none");
  globalState.set('programming_mode_buttons_display', "none");
  resizeCharts();
}

function startProgrammingMode() {
  let game_screen = document.getElementById("game-screen");
  kubePingModalSwitch();
  if (is_demo_mode()) {
    demo_mode_alert();
    return;
  }

  if (globalState.get('programming_mode_switch')) {
    globalState.set('programming_mode_switch', false);
    $("#programmingModeButton").text("Enable Prog. Mode");
  } else {
    document.getElementById("gameContainer").style.width = "100%";
    document.getElementById("gameContainer").style.height = "100%";
    document.getElementById("loadButtonGroup").style.width = "1250px";

    globalState.set('programming_mode_switch', true);
    globalState.set('game_mode_switch', false);
    $("#gameModeButton").text("Enable Game Mode");
    $("#programmingModeButton").text("Disable Prog. Mode");
  }
  if (chaos_program_screen.style.display === "none") {
    chaos_program_screen.style.display = "block";
  } else {
    chaos_program_screen.style.display = "none";
  }
  if (programming_mode_buttons.style.display === "none") {
    programming_mode_buttons.style.display = "block";
  } else {
    programming_mode_buttons.style.display = "none";
  }
  game_buttons.style.display = "none";
  game_screen.style.display = "none";

  if (editor == null) {
    editor = CodeMirror.fromTextArea(chaosProgramTextArea, {
      lineNumbers: true, 
      theme: "dracula",
      mode: "javascript"
    });
    editor.setSize("100%", "100%");
  }
}