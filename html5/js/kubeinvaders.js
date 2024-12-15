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

if (globalState.get('clu_insecure')) {
   globalState.set("http://" + globalState.get('clu_endpoint'));
}
else {
    globalState.set("https://" + globalState.get('clu_endpoint'));
}

console.log("[K-INV STARTUP] k8s_url is " + k8s_url);
console.log("[K-INV STARTUP] platformengineering.it demo_mode is " + String(demo_mode));


function checkHTTP(url, elementId) {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE) {
            $("#" + elementId).val(this.status);
        }
    };;
    oReq.open("GET", url);
    oReq.send();
}

function exportSettings() {
    // Crea un oggetto con i dati delle impostazioni
    const settings = {
        sys_cluster_endpoint: document.getElementById('sys_cluster_endpoint').value,
        sys_insecure_endpoint_flag: document.getElementById('sys_insecure_endpoint_flag').value,
        sys_k8s_proxied_api_http_status_code: document.getElementById('sys_k8s_proxied_api_http_status_code').value,
        sys_openresty_env_vars:  document.getElementById('sys_openresty_env_vars').value
    };
  
    // Converti l'oggetto in una stringa JSON
    const jsonSettings = JSON.stringify(settings, null, 2);
  
    // Crea un blob e un URL per il download
    const blob = new Blob([jsonSettings], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
  
    // Crea un link temporaneo per il download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    document.body.appendChild(a);
    a.click();
  
    // Pulisci
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
  
function setSystemSettings() {
    var sys_element = document.getElementById('sys_cluster_endpoint');
    sys_element.value = k8s_url;

    sys_element = document.getElementById('sys_insecure_endpoint_flag');
    sys_element.value = globalState.get('clu_insecure');

    sys_element = document.getElementById('sys_openresty_env_vars');
    sys_element.value = globalState.get('selected_env_vars');
    
    checkHTTP(globalState.get('k8s_url'), 'sys_k8s_proxied_api_http_status_code')
}

function currentChaosContainerJsonTextAreaVal() {
    return editor_chaos_container_definition.getValue();
}

function setCodeNameToTextInput(elementId) {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            globalState.set('codename') = this.responseText.trim();
            $("#" + elementId).val(globalState.get('codename'));
            $("#" + elementId).text(globalState.get('codename'));
            if (globalState.get('codename') == "") {
                $('#alert_placeholder').replaceWith(alert_div + 'Error getting codename from backend. </div>');
                globalState.set('codename') = "error_fix_getcodename_from_backend";
            }
        }
    };;
    oReq.open("GET", globalState.get('k8s_url') + "/codename");
    oReq.send();
}

function getMetrics() {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        let lines = this.responseText.split('\n');
        let metric = [];
        for (var i = 0;i < lines.length;i++){
            metric = lines[i].split(' ');

            if (metric[0] == "chaos_node_jobs_total") {
                $('#chaos_jobs_total').text(metric[1]);
                globalState.set('chart_chaos_jobs_total') = Number(metric[1]);
            }
            else if (metric[0] == "deleted_pods_total") {
                globalState.set('chart_deleted_pods_total') = Number(metric[1]);
                $('#deleted_pods_total').text(metric[1]);            
            }
            else if (metric[0] == "fewer_replicas_seconds") {
                globalState.set('chart_fewer_replicas_seconds') = Number(metric[1]);
                $('#fewer_replicas_seconds').text(metric[1]);            
            }
            else if (metric[0] == "latest_fewer_replicas_seconds") {
                globalState.set('chart_latest_fewer_replicas_seconds') = Number(metric[1]);
                $('#latest_fewer_replicas_seconds').text(metric[1]);            
            }
            else if (metric[0] == "pods_not_running_on_selected_ns") {
                globalState.set('chart_pods_not_running_on') = Number(metric[1]);
                $('#pods_not_running_on').text(metric[1]);            
            }
            else if (metric[0] == "pods_match_regex:" + globalState.get('random_code')) {
                $('#pods_match_regex').text(metric[1]);            
            }
            else if (metric[0].match(chaos_job_regex)) {
                metrics_split = metric[0].split(":");
                globalState.get('chaos_jobs_status').set(metrics_split[1] + ":" + metrics_split[2] + ":" +  metrics_split[3], metric[1]);
            }
            else if (metric[0] == "current_chaos_job_pod") {
                globalState.set('chart_current_chaos_job_pod') = Number(metric[1]);
                $('#current_chaos_job_pod').text(metric[1]);
            }
        }
    };;

    oReq.open("GET", globalState.get('k8s_url') + "/metrics");
    oReq.send();
}

function getChaosJobsPodsPhase() {
    var oReq = new XMLHttpRequest();
    let metrics_split = [];
    let metric = [];
    oReq.onload = function () {
        var lines = this.responseText.split('\n');
        for (var i = 0; i < lines.length; i++) {
            metric = lines[i].split(' ');

            if (metric[0].match(chaos_job_regex)) {
                metrics_split = metric[0].split(":");
                globalState.get('chaos_jobs_status').set(metrics_split[1] + ":" + metrics_split[2] + ":" + metrics_split[3], metric[1]);
            }
        }
    };
    oReq.open("GET", globalState.get('k8s_url') + "/chaos_jobs_pod_phase");
    oReq.send();
}

function scroll_backwards() {
    if (globalState.get('chaos_logs_pos') > 0){
        globalState.set('chaos_logs_pos', globalState.get('chaos_logs_pos') - 1);
        $('#current_log_pos').text(globalState.get('chaos_logs_pos'));
        getChaosJobsLogs();
    } 
}

function getTotalLogsPos() {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if (globalState.get('log_tail_switch')) {
                if (this.responseText.trim() == "null") {
                    $('#total_logs_pos').text("0");
                } else {
                    $('#total_logs_pos').text(this.responseText);
                }
            }
        }
    };
    oReq.open("GET", globalState.get('k8s_url') + "/chaos/logs/count?logid=" + globalState.get('random_code'));
    oReq.send();
}

function scroll_forward() {
    globalState.set('chaos_logs_pos', globalState.get('chaos_logs_pos') + 1);
    $('#current_log_pos').text(globalState.get('chaos_logs_pos'));
    getChaosJobsLogs();
}

function getChaosJobsLogs() {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if (globalState.get('log_tail_switch')) {
                if (this.responseText.trim() == "null") {
                    document.getElementById("logTailDiv").innerHTML = "Logs has been cleaned...";
                } else {
                    document.getElementById("logTailDiv").innerHTML = "";
                    document.getElementById("logTailDiv").innerHTML = this.responseText;
                }
            }
        }
    };
    oReq.open("GET", globalState.get('k8s_url') + "/chaos/logs?logid=" + globalState.get('random_code') + "&pos=" + globalState.get('chaos_logs_pos'));
    oReq.send();
    keepAliveJobsLogs();
}

function keepAliveJobsLogs() {
    var oReq = new XMLHttpRequest();
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            if (!this.responseText.toLowerCase().match(/.*null.*/)) {
                $('#alert_placeholder3').replaceWith(log_tail_alert_no_pixel + this.responseText.replace("nil", "") + '</div>');
            }
        }
    };
    oReq.open("GET", globalState.get('k8s_url') + "/chaos/logs/keepalive?logid=" + globalState.get('random_code') + "&pos=" + globalState.get('chaos_logs_pos'));
    oReq.send();
}

function runKubeLinter() {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        kubelinter = this.responseText;
        $('#alert_placeholder').replaceWith(alert_div + "KubeLinter executed correctly on namespace " + globalState.get('namespace') +  ". Changing Regex and activating logs tail.");
        enableLogTail();
        setLogRegex();

        $('#logTailRegex').val('{"since": "60", "pod":".*", "namespace":"' + globalState.get('namespace') + '", "labels":".*", "annotations":".*", "containers":".*"}');
        
        if (!globalState.get('log_tail_switch')) {
            setLogConsole(); 
        }
    };

    $('#currentKubeLinterResult').text('KubeLinter launched. Set this regex and start log tail: {"since": "60", "pod":".*", "namespace":"' + globalState.get('namespace') + '", "labels":".*", "annotations":".*", "containers":".*"}');

    oReq.open("GET", globalState.get('k8s_url') + "/kube/kube-linter?logid=" + globalState.get('random_code') +"&namespace=" + globalState.get('namespace'));
    oReq.send();
}

function getNamespaces() {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        let namespaces = this.responseText.split(",");
        globalState.set('namespaces', namespaces);
        globalState.set('namespace', namespaces[globalState.get('namespaces_index')]);
        console.log("[CURRENT-NAMESPACE] " + globalState.get('namespace'));
        $('#currentGameNamespace').text(globalState.get('namespace'));
    };
    oReq.open("GET", globalState.get('k8s_url') + "/kube/namespaces");
    oReq.send();
}

function getEndpoint() {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        globalState.set('endpoint', this.responseText);
    };
    oReq.open("GET", globalState.get('k8s_url') + "/kube/endpoint");
    oReq.send();
}

function getCurrentChaosContainer() {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        job_parsed = JSON.stringify(JSON.parse(this.responseText), null, 4);
        $('#currentChaosContainerYaml').text(job_parsed);
        editor_chaos_container_definition.setValue(job_parsed);
        editor_chaos_container_definition.refresh();  
    };
    oReq.open("GET", globalState.get('k8s_url') + "/kube/chaos/containers?action=container_definition");
    oReq.send();
}

function enableLogTail() {
    var oReq = new XMLHttpRequest();
    oReq.open("POST", globalState.get('k8s_url') + "/kube/chaos/containers?action=enable_log_tail&id=" + globalState.get('random_code'), true);
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            $('#alert_placeholder3').replaceWith(log_tail_alert + 'Logs tail started </div>');
        }
    };
    oReq.setRequestHeader("Content-Type", "application/json");
    oReq.send("{}");
    setLogRegex();
}

function disableLogTail() {
    var oReq = new XMLHttpRequest();
    oReq.open("POST", globalState.get('k8s_url') + "/kube/chaos/containers?action=disable_log_tail&id=" + globalState.get('random_code'), true);
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            $('#alert_placeholder3').replaceWith(log_tail_alert + 'Logs tail stopped </div>');
        }
    };
    oReq.setRequestHeader("Content-Type", "application/json");
    oReq.send("{}");
}

function setLogRegex() {
    log_tail_div.style.display = "block";
    $('#alert_placeholder3').replaceWith(log_tail_alert + 'Setting regex for filtering log source (by pod name)</div>');
    var oReq = new XMLHttpRequest();
    oReq.open("POST", globalState.get('k8s_url') + "/kube/chaos/containers?action=set_log_regex&id=" + globalState.get('random_code'), true);
    oReq.onreadystatechange = function () {
        if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
            $('#alert_placeholder3').replaceWith(log_tail_alert + 'New regex has been configured</div>');
        }
    };
    oReq.setRequestHeader("Content-Type", "application/json");
    oReq.send($('#logTailRegex').val());
}

function setChaosContainer() {
    if (!IsJsonString(currentChaosContainerJsonTextAreaVal())) {
        $('#alert_placeholder2').text('JSON syntax not valid.');
    }
    else {
        var oReq = new XMLHttpRequest();
        oReq.open("POST", globalState.get('k8s_url') + "/kube/chaos/containers?action=set", true);

        oReq.onreadystatechange = function () {
            if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
                $('#alert_placeholder2').text('New container definition has been saved.');
            }
        };
        oReq.setRequestHeader("Content-Type", "application/json");
        oReq.send(currentChaosContainerJsonTextAreaVal());
    }
}

function startChaosNode(node_name) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Launched chaos job against ' + node_name + '</div>');
    };
    $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Start chaos job against ' + node_name + '</div>');
    oReq.open("GET", globalState.get('k8s_url') + "/kube/chaos/nodes?nodename=" + node_name + "&namespace=" + globalState.get('namespace'));
    oReq.send();
}

function deletePods(pod_name) {
    var oReq = new XMLHttpRequest();
    oReq.onload = function () {
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Kill ' + pod_name + '</div>');
    };
    oReq.open("GET", globalState.get('k8s_url') + "/kube/pods?action=delete&pod_name=" + pod_name + "&namespace=" + globalState.get('namespace'));
    oReq.send();
}

function getPods() {
    if (globalState.get('chaos_pods')) {
        var oReq = new XMLHttpRequest();
        oReq.onload = function () {
            new_pods = JSON.parse(this.responseText)["items"];

            // Pod might just be killed in game, but not terminated in k8s yet.
            for (i=0; i<new_pods.length; i++) {
                if (globalState.get('aliens').some((alien) => alien.name == new_pods[i].name && alien.status == "killed")) {
                    new_pods[i].status = "killed";
                }
            }

            if (globalState.get('nodes') && globalState.get('nodes').length > 0) {
                globalState.set('pods', new_pods.concat(globalState.get('nodes')));
            } else {
                globalState.set('pods', new_pods);
            }
        };
        oReq.open("GET", globalState.get('k8s_url') + "/kube/pods?action=list&namespace=" + globalState.get('namespace'));
        oReq.send();
    }
    else {
        if (globalState.get('nodes') && globalState.get('nodes').length > 0) {
            globalState.set('pods', globalState.get('nodes'));
        } else {
            globalState.set('pods', []);
        }    
    }
}

function getNodes() {
    if (globalState.get('chaos_nodes')) {
        var oReq = new XMLHttpRequest();
        oReq.onload = function () {
            json_parsed = JSON.parse(this.responseText);
            globalState.set('nodes', json_parsed["items"]);
        };
        oReq.open("GET", globalState.get('k8s_url') + "/kube/nodes");
        oReq.send();
    }
    else {
        globalState.set('nodes', []);
    }
}

window.setInterval(function getKubeItems() {
    if (globalState.get('game_mode_switch')) {
        getNodes();
        getPods();
    }
}, 500);

function keyDownHandler(e) {
    if (!globalState.get('modal_opened') && globalState.get('game_mode_switch')) {
        e.preventDefault();
        if (e.key == "Right" || e.key == "ArrowRight") {
            globalState.set('rightPressed') = true;
        }
        else if (e.key == "Left" || e.key == "ArrowLeft") {
            globalState.set('leftPressed', true);
        }
        if (e.key == "Up" || e.key == "ArrowUp") {
            globalState.set('upPressed', true);
        }
        else if (e.key == "Down" || e.key == "ArrowDown") {
            globalState.set('downPressed', true);
        }
        else if (e.keyCode == 83) {
            if (globalState.get('shuffle')) {
                globalState.set('shuffle', false);
                $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Disable shuffle</div>');
            }
            else {
                globalState.set('shuffle') = true;
                $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Enable shuffle</div>');
            }
        }
        else if (e.keyCode == 32) {
            globalState.set('shot', true);
        }
        else if (e.keyCode == 78) {
            switchNamespace();
        }
        else if (e.keyCode == 72) {
            if (globalState.get('help')) {
                globalState.set('help', false);
            }
            else {
                globalState.set('help', true);
            }
        }
        else if (e.keyCode == 67) {
            if (is_demo_mode()) {
                demo_mode_alert();
                return;
            }

            if (globalState.get('chaos_nodes')) {
                globalState.set('chaos_nodes', false);
                $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Hide nodes</div>');
            }
            else {
                globalState.set('chaos_nodes', true);
                $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Show nodes</div>');
            }
        }
        else if (e.keyCode == 80) {
            if (globalState.get('chaos_pods')) {
                globalState.set('chaos_pods', false);
                $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Hide pods</div>');
            }
            else {
                globalState.set('chaos_pods', true);
                $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Show pods</div>');
            }
        }
    }
}

function keyUpHandler(e) {
    if (e.key == "Right" || e.key == "ArrowRight") {
        globalState.set('rightPressed', false);
    }
    else if (e.key == "Left" || e.key == "ArrowLeft") {
        globalState.set('leftPressed', false);
    }
    else if (e.key == "Up" || e.key == "ArrowUp") {
        globalState.set('upPressed', false);
    }
    else if (e.key == "Down" || e.key == "ArrowDown") {
        globalState.set('downPressed', false);
    }
}

function drawAlien(alienX, alienY, name, status) {
    var image = new Image(); // Image constructor
    if (globalState.get('nodes').some((node) => node.name == name)) {
        image.src = './images/k8s_node.png';
        ctx.drawImage(image, alienX, alienY, 30, 40);
    }
    else {
        image.src = `./images/sprite_invader_${status}.png`;
        ctx.font = '8px pixel';
        ctx.drawImage(image, alienX, alienY, 40, 40);
        if (globalState.get('showPodName')) {
            ctx.fillText(name.substring(0, 19) + '..', alienX, alienY + 40);
        }
    }
    ctx.closePath();
}

function checkRocketAlienCollision() {
    if (contains(globalState.get('aliensY'), rocketY)) {
        var i;
        for (i = globalState.get('aliens').length - 1; i >= 0; i--) {
            if (globalState.get('aliens')[i]["active"] && (rocketY - globalState.get('aliens')[i]["y"] < 5)) {
                var rangeX = []
                rangeX.push(globalState.get('aliens')[i]["x"]);

                for (k = globalState.get('aliens')[i]["x"]; k < globalState.get('aliens')[i]["x"] + aliensWidth; k++) {
                    rangeX.push(k);
                }

                if (contains(rangeX, rocketX)) {
                    collisionDetected = true;
                    globalState.get('aliens')[i]["status"] = "killed";
                    // Aliens might be updated before new pods are fetched
                    for (j = 0; j < globalState.get('pods').length; j++) {
                        if (globalState.get('pods')[j].name == globalState.get('aliens')[i].name) {
                            globalState.get('pods')[j].status = "killed";
                        }
                    }
                    if (globalState.get('nodes').some((node) => node.name == globalState.get('aliens')[i]["name"])) {
                        globalState.get('aliens')[i]["active"] = false;
                        startChaosNode(globalState.get('aliens')[i]["name"]);
                    }
                    else {
                        deletePods(globalState.get('aliens')[i]["name"]);
                    }
                    return true;
                }
            }
        }
    }
    return false;
}

function shuffleAliens() {
    globalState.set('pods', globalState.get('pods').sort(() => Math.random() - 0.5));
}

function drawRocket() {
    var image = new Image(); // Image constructor
    image.src = './images/kuberocket.png';
    ctx.drawImage(image, rocketX, rocketY, 20, 20);
    ctx.closePath();

    if (checkRocketAlienCollision()) {
        globalState.set('rocketY', -100);
        globalState.set('rocketX', -100);
        globalState.set('collisionDetected', false);
        return
    }

    if (globalState.get('shot') && globalState.get('rocketLaunched')) {
        if (globalState.get('rocketY') < 0) {
            globalState.set('shot', false);
            globalState.set('rocketLaunched', false);
        }
        else {
            globalState.set('rocketY', globalState.get('rocketY') - globalState.get('rocketSpeed'));
        }
    }
    else {
        globalState.set('rocketX', globalState.get('spaceshipX') + (spaceshipWidth / 3));
        globalState.set('rocketY', globalState.get('spaceshipY'));
        globalState.set('rocketLaunched', true);
    }
}

function drawSpaceship() {
    var image = new Image(); // Image constructor
    image.src = './images/spaceship.png';
    ctx.drawImage(image, globalState.get('spaceshipX'), globalState.get('spaceshipY'), 60, 60);
    ctx.closePath();
}

window.setInterval(function draw() {
    if (globalState.get('namespacesJumpFlag')) {
        randNamespaceJump(1, 10, 8);
    }
}, 1000)

window.setInterval(function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (i = 0; i < globalState.get('aliens').length; i++) {
        if (globalState.get('aliens')[i]["active"]) {
            drawAlien(globalState.get('aliens')[i]["x"], globalState.get('aliens')[i]["y"], globalState.get('aliens')[i]["name"], globalState.get('aliens')[i]["status"]);
        }
    }
    drawSpaceship();

    if (globalState.get('shot') && !globalState.get('collisionDetected')) {
        drawRocket();
    }

    if (globalState.get('x') + globalState.get('dx') > canvas.width - globalState.get('ballRadius') || globalState.get('x') + globalState.get('dx') <  globalState.get('ballRadius')) {
        globalState.set('dx', -globalState.get('dx'));
    }
    if (globalState.get('y') + globalState.get('dy') > canvas.height - globalState.get('ballRadius') || globalState.get('y') + globalState.get('dy') <  globalState.get('ballRadius')) {
        globalState.set('dy', -globalState.get('dy'));
    }

    if (globalState.get('autoPilot')) {
        globalState.set('spaceshipY', 340);

        if (getRandomInt(100) < globalState.get('randomFactor')) {
            globalState.set('shot', true);
        }

        if (globalState.get('autoPilotDirection') == 0) {
            globalState.set('autoPilotDirection', getRandomInt(canvas.width - spaceshipWidth));
            globalState.set('spaceshipxOld', globalState.get('spaceshipX'));
        }
        else if ((spaceshipX == globalState.get('autoPilotDirection'))) {
            globalState.set('autoPilotDirection', getRandomInt(canvas.width - spaceshipWidth));
            globalState.set('spaceshipxOld', globalState.get('spaceshipX'));
        }
        else if ((globalState.get('autoPilotDirection') < globalState.get('spaceshipxOld')) && globalState.get('spaceshipX') < globalState.get('autoPilotDirection')) {
            globalState.set('autoPilotDirection', getRandomInt(canvas.width - spaceshipWidth));
            globalState.set('spaceshipxOld', globalState.get('spaceshipX'));
        }
        else if ((globalState.get('autoPilotDirection') > globalState.get('spaceshipxOld')) && (globalState.get('spaceshipX') > globalState.get('autoPilotDirection'))) {
            globalState.set('autoPilotDirection', getRandomInt(canvas.width - spaceshipWidth));
            globalState.set('spaceshipxOld', globalState.get('spaceshipX'));
        }
        else {
            if (autoPilotDirection > globalState.get('spaceshipX')) {
                globalState.set('spaceshipX', globalState.get('spaceshipX') + 5);
            }
            else {
                globalState.set('spaceshipX', globalState.get('spaceshipX') - 5);
            }
        }
    }

    if (globalState.get('rightPressed')) {
        globalState.set('spaceshipX', globalState.get('spaceshipX') + 3);
        if (globalState.get('spaceshipX') + spaceshipWidth > canvas.width) {
            globalState.set('spaceshipX', canvas.width - spaceshipWidth);
        }
    }
    else if (globalState.get('leftPressed')) {
        globalState.set('spaceshipX', globalState.get('spaceshipX') - 3);
        if (globalState.get('spaceshipX') < 0) {
            globalState.set('spaceshipX', 0);
        }
    }

    if (globalState.get('upPressed')) {
        globalState.set('spaceshipY', globalState.get('spaceshipY') - 3);
        if (globalState.get('spaceshipY') < 0) {
            globalState.set('spaceshipY', 0);
        }
    }
    else if (globalState.get('downPressed')) {
        globalState.set('spaceshipY', globalState.get('spaceshipY') + 3);
        if (globalState.get('spaceshipY') + spaceshipHeight > canvas.height) {
            globalState.set('spaceshipY', canvas.height - spaceshipHeight);
        }
    }

    ctx.fillStyle = 'white';
    ctx.font = '16px pixel';

    ctx.fillText('Cluster: ' + globalState.get('endpoint'), 10, startYforHelp);
    ctx.fillText('Current Namespace: ' + globalState.get('namespace'), 10, startYforHelp + 20);
    ctx.fillText('Alien Shuffle: ' + globalState.get('shuffle'), 10, startYforHelp + 40);
    ctx.fillText('Auto Namespaces Switch: ' + globalState.get('namespacesJumpStatus'), 10, startYforHelp + 60);

    ctx.fillText('press \'h\' for help!', 10, startYforHelp + 80);

    if (globalState.get('help')) {
        ctx.fillText('h => Activate or deactivate help', 10, 280);
        ctx.fillText('s => Activate or deactivate shuffle for aliens', 10, 300);
        ctx.fillText('n => Change namespace', 10, 320);
        ctx.fillText('p => Activate or deactivate chaos engineering against pods', 10, 340);
        ctx.fillText('c => Activate or deactivate chaos engineering against nodes', 10, 360);
    }
}, 10)

function buttonShuffleHelper() {
    if (globalState.get('shuffle')) {
        globalState.set('shuffle', false);
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Shuffle Disable</div>');
        $("#buttonShuffle").text("Enable Shuffle");
    }
    else {
        globalState.set('shuffle', true);
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Shuffle Enabled</div>');
        $("#buttonShuffle").text("Disable Shuffle");
    }
}

function namespacesJumpControl() {
    if (globalState.get('namespacesJumpFlag')) {
        globalState.set('namespacesJumpFlag', false);
        $("#namespacesJumpButton").text("Enable Auto NS Switch");
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Disabled automatic switch of namespace</div>');
        globalState.set('namespacesJumpStatus', 'Disabled');
    } else {
        globalState.set('namespacesJumpFlag', true);
        $("#namespacesJumpButton").text("Disable Auto NS Switch");
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Enabled automatic switch of namespace </div>');
        globalState.set('namespacesJumpStatus', 'Enabled');
    }
}

function showPodNameControl() {
    if (globalState.get('showPodName')) {
        globalState.set('showPodName', false);
        $("#buttonOnlyPodName").text("Show Pods Name");
    }
    else {
        globalState.set('showPodName', true);
        $("#buttonOnlyPodName").text("Hide Pods Name");
    }
}

function podExists(podName) {
    for (i = 0; i < globalState.get('aliens').length; i++) {
        if (globalState.get('aliens')[i]["name"] == podName) {
            return true;
        }
    }
    return false;
}

function findReplace() {
    for (i = 0; i < globalState.get('aliens').length; i++) {
        if (!globalState.get('aliens')[i]["active"]) {
            return i;
        }
    }
    return -1;
}

function randNamespaceJump(min, max, jumpRandomFactor) {
    if ((Math.random() * (max - min) + min) > jumpRandomFactor) {
        $('#alert_placeholder').replaceWith(alert_div + 'Latest action: Switch Namespace</div>');
        switchNamespace();
    }
}

window.setInterval(function setAliens() {
    if (globalState.get('shuffle')) {
        globalState.set('pods', globalState.get('pods').sort(() => Math.random() - 0.5));
    }

    globalState.set('aliens', []);
    if (globalState.get('pods').length > 0) {
        for (k = 10; k > 0; k--) {
            if (!contains(globalState.get('aliensY'), k)) {
                globalState.get('aliensY').push(k);
            }
        }
        var x = 10;
        var y = 10;
        var yInc = false;

        for (i = 0; i < globalState.get('pods').length; i++) {
            if (!podExists(globalState.get('pods')[i].name)) {
                var replaceWith = findReplace();
                if (replaceWith != -1) {
                    globalState.get('aliens')[replaceWith] = {
                        "name": globalState.get('pods')[i].name,
                        "status": globalState.get('pods')[i].status,
                        "x": globalState.get('aliens')[replaceWith]["x"],
                        "y": globalState.get('aliens')[replaceWith]["y"],
                        "active": true
                    }
                    cnt = +1;
                }
                else {
                    if (!yInc) {
                        y += 20;
                        yInc = true;
                    }
                    else {
                        y -= 20;
                        yInc = false;
                    }
                    globalState.get('aliens').push({
                        "name": globalState.get('pods')[i].name,
                        "status": globalState.get('pods')[i].status,
                        "x": x,
                        "y": y,
                        "active": true
                    });
                    cnt = +1;
                }
                if (globalState.get('aliens').length % maxAliensPerRow == 0) {
                    x = 10;
                    y += aliensIncrementY;
                    for (k = y + 10; k >= y; k--) {
                        if (!contains(globalState.get('aliensY'), k)) {
                            globalState.get('aliensY').push(k);
                        }
                    }
                }
                else {
                    x += 60;
                }
            }
        }
    }
}, 1000)

window.setInterval(function backgroundTasks() {

    if (!globalState.get('codename_configured')) {
        let chaosProgram = $('#chaosProgramTextArea').val();
        let chaosProgramWithCodename = chaosProgram.replace(globalState.get('codename_regex'), "chaos-codename: " + globalState.get('codename'));
        $('#chaosProgramTextArea').val(chaosProgramWithCodename);
        $('#chaosProgramTextArea').text(chaosProgramWithCodename);
        globalState.set('chaosProgram', chaosProgramWithCodename);
        globalState.set('codename_configured', true);
    }

    if (globalState.get('game_mode_switch') || globalState.get('programming_mode_switch') || globalState.get('log_tail_switch')) {
        getMetrics();
        getChaosJobsPodsPhase();
        updateMainMetricsChart();
    }

    if (globalState.get('log_tail_switch')) {
        getChaosJobsLogs();
        getTotalLogsPos();
    }

    if (globalState.get('programming_mode_switch') && globalState.get('chaos_program_valid')) {
        drawChaosProgramFlow();
    }

    if (globalState.get('chaos_report_switch')) {
        updateElapsedTimeArray(chaosReportprojectName);
        updateChaosReportStartTime(chaosReportprojectName);
        drawCanvasHTTPStatusCodeStats();
        chaosReportKeepAlive(chaosReportprojectName);
    }

}, 2000)

document.addEventListener("keydown", keyDownHandler, false);
document.addEventListener("keyup", keyUpHandler, false);

setSystemSettings();
getEndpoint();
getNamespaces();
getSavedPresets();

document.getElementById("gameContainer").style.visibility = "hidden";
document.getElementById("metricsPresetsRow").style.visibility = "hidden";
document.getElementById("gameContainer").style.opacity = 0;
document.getElementById("metricsPresetsRow").style.opacity = 0;
document.getElementById("gameContainer").style.visibility = "visible";
document.getElementById("metricsPresetsRow").style.visibility = "visible";
document.getElementById("gameContainer").style.opacity = 1;
document.getElementById("metricsPresetsRow").style.opacity = 1;

// TO DO: Apply also when modals are opened
$('.modal').on('hidden.bs.modal', function () {
    setModalState(false);
});