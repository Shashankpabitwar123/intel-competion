/* Intel Sustainability Summit Check-In
   Features: greeting, totals, per-team counts, leader highlight,
   progress bar to goal, celebration overlay, persistence via localStorage,
   attendee list (search + export), reset
*/

(() => {
    // ---- Config ----
    const GOAL = 50;
    const STORAGE_KEY = "intel_summit_state_v1";
  
    // ---- Elements ----
    const totalCountEl   = document.getElementById("totalCount");
    const goalCountEl    = document.getElementById("goalCount");
    const progressWrap   = document.querySelector(".progress-wrap");
    const progressBarEl  = document.getElementById("progressBar");
    const greetEl        = document.getElementById("greet");
    const formEl         = document.getElementById("checkinForm");
    const nameInput      = document.getElementById("nameInput");
    const teamSelect     = document.getElementById("teamSelect");
    const checkinBtn     = document.getElementById("checkinBtn");
    const listEl         = document.getElementById("attendeeList");
    const emptyStateEl   = document.getElementById("emptyState");
    const searchInput    = document.getElementById("searchInput");
    const exportBtn      = document.getElementById("exportBtn");
    const resetBtn       = document.getElementById("resetBtn");
    const yearEl         = document.getElementById("year");
    // counters
    const countEls = {
      water: document.getElementById("count-water"),
      netzero: document.getElementById("count-netzero"),
      renewables: document.getElementById("count-renewables"),
    };
    const cards = {
      water: document.getElementById("card-water"),
      netzero: document.getElementById("card-netzero"),
      renewables: document.getElementById("card-renewables"),
    };
  
    // Celebration
    const celebrateRoot = document.getElementById("celebration");
    const winnerLine    = document.getElementById("winnerLine");
    const celebrateClose= document.getElementById("celebrationClose");
    const confettiCanvas= document.getElementById("confetti");
    let confettiCtx, confettiParticles = [], confettiTimer;
  
    // ---- State ----
    let state = {
      total: 0,
      teams: { water: 0, netzero: 0, renewables: 0 },
      attendees: [] // {name, team, at}
    };
  
    // ---- Init ----
    goalCountEl.textContent = GOAL;
    progressWrap.setAttribute("aria-valuemax", String(GOAL));
    yearEl.textContent = new Date().getFullYear();
  
    load();
    renderAll();
    attachEvents();
  
    // ---- Functions ----
    function attachEvents(){
      // Enable button only when valid inputs
      const validate = () => {
        checkinBtn.disabled = !(nameInput.value.trim().length >= 2 && teamSelect.value);
      };
      nameInput.addEventListener("input", validate);
      teamSelect.addEventListener("change", validate);
  
      formEl.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = nameInput.value.trim();
        const team = teamSelect.value;
        if(!name || !team) return;
  
        checkIn(name, team);
        formEl.reset();
        checkinBtn.disabled = true;
        nameInput.focus();
      });
  
      searchInput.addEventListener("input", renderList);
      exportBtn.addEventListener("click", exportCSV);
      resetBtn.addEventListener("click", onReset);
  
      celebrateClose.addEventListener("click", closeCelebration);
      // keyboard ESC to close
      document.addEventListener("keydown", (e)=> {
        if(e.key === "Escape" && celebrateRoot.classList.contains("active")) closeCelebration();
      });
    }
  
    function checkIn(name, team){
      // prevent duplicate sequential whitespace & title case
      name = name.replace(/\s+/g,' ').trim();
      const at = new Date().toISOString();
  
      state.total += 1;
      state.teams[team] += 1;
      state.attendees.unshift({ name, team, at });
  
      save();
      renderAll();
  
      // Greeting
      const teamLabel = readTeam(team);
      greetEl.textContent = `🎉 Welcome, ${name} from ${teamLabel}!`;
  
      // Maybe celebrate
      if(state.total >= GOAL){
        const winner = computeLeader();
        showCelebration(`🎉 We hit ${GOAL}! Winning team: ${readTeam(winner)} with ${state.teams[winner]} check-ins.`);
      }
    }
  
    function readTeam(id){
      switch(id){
        case "water": return "Team Water Wise";
        case "netzero": return "Team Net Zero";
        case "renewables": return "Team Renewables";
        default: return "Unknown Team";
      }
    }
  
    function computeLeader(){
      const entries = Object.entries(state.teams);
      entries.sort((a,b)=> b[1]-a[1]);
      return entries[0][0]; // id of leader
    }
  
    function renderAll(){
      totalCountEl.textContent = state.total;
      progressBarEl.style.width = `${Math.min(100, (state.total/GOAL)*100)}%`;
      progressWrap.setAttribute("aria-valuenow", String(state.total));
  
      // per team
      Object.keys(countEls).forEach(k=>{
        countEls[k].textContent = state.teams[k];
        cards[k].classList.remove("leader");
      });
      // leader highlight (if tie, first by order)
      const leader = computeLeader();
      cards[leader].classList.add("leader");
  
      renderList();
    }
  
    function renderList(){
      const q = searchInput.value?.toLowerCase().trim() || "";
      listEl.innerHTML = "";
  
      const items = state.attendees.filter(a => {
        if(!q) return true;
        return a.name.toLowerCase().includes(q) || readTeam(a.team).toLowerCase().includes(q);
      });
  
      emptyStateEl.style.display = items.length ? "none" : "block";
  
      for(const a of items){
        const li = document.createElement("li");
        const left = document.createElement("div");
        left.style.display = "flex";
        left.style.flexDirection = "column";
  
        const title = document.createElement("strong");
        title.textContent = a.name;
        const subtle = document.createElement("span");
        subtle.textContent = new Date(a.at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        subtle.style.color = "#8aa2bb";
        subtle.style.fontSize = "12px";
  
        left.appendChild(title);
        left.appendChild(subtle);
  
        const badge = document.createElement("span");
        badge.className = "badge";
        badge.textContent = readTeam(a.team);
  
        li.appendChild(left);
        li.appendChild(badge);
        listEl.appendChild(li);
      }
    }
  
    function exportCSV(){
      if(!state.attendees.length) return;
      const rows = [["Name","Team","Timestamp"]];
      state.attendees.slice().reverse().forEach(a=>{
        rows.push([a.name, readTeam(a.team), a.at]);
      });
      const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "intel-summit-attendees.csv";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }
  
    function onReset(){
      if(!confirm("Reset all saved counts and attendees?")) return;
      state = { total:0, teams:{water:0, netzero:0, renewables:0}, attendees:[] };
      save();
      renderAll();
      greetEl.textContent = "👋 Welcome! Please check in below.";
    }
  
    // ---- Persistence ----
    function save(){
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
    function load(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(raw){
          const parsed = JSON.parse(raw);
          // basic shape validation
          if(parsed && typeof parsed.total === "number" && parsed.teams && Array.isArray(parsed.attendees)){
            // defensive: ensure teams exist
            state.total = parsed.total|0;
            state.teams = Object.assign({water:0, netzero:0, renewables:0}, parsed.teams);
            state.attendees = parsed.attendees;
          }
        }
      }catch(e){
        console.warn("Could not load saved state", e);
      }
    }
  
    // ---- Celebration ----
    function showCelebration(text){
      winnerLine.textContent = text;
      celebrateRoot.classList.add("active");
      celebrateRoot.setAttribute("aria-hidden","false");
      startConfetti();
    }
    function closeCelebration(){
      celebrateRoot.classList.remove("active");
      celebrateRoot.setAttribute("aria-hidden","true");
      stopConfetti();
    }
  
    function startConfetti(){
      // lightweight particle confetti
      const canvas = confettiCanvas;
      confettiCtx = canvas.getContext("2d");
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
  
      confettiParticles = Array.from({length: 140}).map(()=>({
        x: Math.random()*canvas.width,
        y: Math.random()*-canvas.height,
        r: 2 + Math.random()*4,
        vy: 1 + Math.random()*3,
        vx: -1 + Math.random()*2,
        a: Math.random()*Math.PI*2
      }));
  
      const step = () => {
        confettiCtx.clearRect(0,0,canvas.width,canvas.height);
        confettiParticles.forEach(p=>{
          p.x += p.vx;
          p.y += p.vy;
          p.a += 0.03;
          if(p.y > canvas.height+10){ p.y = -10; p.x = Math.random()*canvas.width }
          confettiCtx.beginPath();
          confettiCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
          confettiCtx.fillStyle = (p.y % 3 < 1) ? "#00a0ff" : (p.y % 5 < 1 ? "#22c55e" : "#eab308");
          confettiCtx.fill();
        });
        confettiTimer = requestAnimationFrame(step);
      };
      step();
    }
  
    function stopConfetti(){
      window.removeEventListener("resize", resizeCanvas);
      if(confettiTimer) cancelAnimationFrame(confettiTimer);
      const ctx = confettiCtx;
      if(ctx) ctx.clearRect(0,0,confettiCanvas.width,confettiCanvas.height);
    }
  
    function resizeCanvas(){
      confettiCanvas.width  = window.innerWidth;
      confettiCanvas.height = window.innerHeight;
    }
  })();
  