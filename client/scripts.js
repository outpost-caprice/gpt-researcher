const GPTResearcher = (() => {
  const init = () => {
    updateState("initial");
  }

  const startResearch = () => {
    document.getElementById("output").innerHTML = "";
    document.getElementById("reportContainer").innerHTML = "";
    updateState("in_progress");
    addAgentResponse({ output: "🤔 質問からどのようなタスクを行うか考えています……" });
    listenToSockEvents();
  };

  const listenToSockEvents = () => {
    const { protocol, host, pathname } = window.location;
    const ws_uri = `${protocol === 'https:' ? 'wss:' : 'ws:'}//${host}${pathname}ws`;
    const converter = new showdown.Converter();
    let socket;

    try {
      socket = new WebSocket(ws_uri);
      socket.onmessage = (event) => handleSocketMessage(event, converter, socket);
      socket.onopen = () => handleSocketOpen(socket);
    } catch (error) {
      console.error("WebSocket Error:", error);
      updateState("error");
    }
  };

  const handleSocketMessage = (event, converter, socket) => {
    const data = JSON.parse(event.data);
    if (data.type === 'logs') {
      addAgentResponse(data);
    } else if (data.type === 'report') {
      writeReport(data, converter);
    } else if (data.type === 'path') {
      updateState("finished");
      updateDownloadLink(data);
      socket.close();
    }
  };

  const handleSocketOpen = (socket) => {
    const task = document.querySelector('textarea[name="task"]').value;
    const report_type = document.querySelector('select[name="report_type"]').value;
    const agent = document.querySelector('input[name="agent"]:checked').value;

    const requestData = {
      task: task,
      report_type: report_type,
      agent: agent,
    };

    socket.send(`start ${JSON.stringify(requestData)}`);
  };

  const addAgentResponse = (data) => {
    const output = document.getElementById("output");
    output.innerHTML += '<div class="agent_response">' + data.output + '</div>';
    output.scrollTop = output.scrollHeight;
    output.style.display = "block";
    updateScroll();
  };

  const writeReport = (data, converter) => {
    const reportContainer = document.getElementById("reportContainer");
    const markdownOutput = converter.makeHtml(data.output);
    reportContainer.innerHTML += markdownOutput;
    updateScroll();
  };

  const updateDownloadLink = (data) => {
    const path = data.output;
    document.getElementById("downloadLink").setAttribute("href", path);
  };

  const updateScroll = () => {
    window.scrollTo(0, document.body.scrollHeight);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(document.getElementById('reportContainer').innerText);
      console.log("Text copied to clipboard");
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const updateState = (state) => {
    const statusElement = document.getElementById("status");
    statusElement.innerHTML = stateMessages[state] || "";
    statusElement.style.display = statusElement.innerHTML ? "block" : "none";
    setReportActionsStatus(state === "finished" ? "enabled" : (state === "initial" ? "hidden" : "disabled"));
  }

  const stateMessages = {
    "in_progress": "Research in progress...",
    "finished": "Research finished!",
    "error": "Research failed!",
    "initial": "",
  };

  const setReportActionsStatus = (status) => {
    const reportActions = document.getElementById("reportActions");
    reportActions.querySelectorAll("a").forEach((link) => {
      link.classList.toggle("disabled", status !== "enabled");
      link.setAttribute('onclick', status === "enabled" ? '' : "return false;");
    });
    reportActions.style.display = status === "hidden" ? "none" : "block";
  }

  document.addEventListener("DOMContentLoaded", init);
  return {
    startResearch,
    copyToClipboard,
  };
})();
