function fillChatPrompt(text){
    const input=document.getElementById('chatInput');
    if(input){
        input.value=text;
        input.focus();
    }
}
function escapeHtml(t){
    const d=document.createElement('div');
    d.textContent=t ?? '';
    return d.innerHTML;
}
function decodeHtmlEntities(text){
    const textarea=document.createElement('textarea');
    textarea.innerHTML=text || '';
    return textarea.value;
}
function normalizeChatAnswer(html){
    if(!html) return '';
    return decodeHtmlEntities(String(html)
        .replace(/<\s*br\s*\/?>/gi,'\n')
        .replace(/<\s*\/p\s*>/gi,'\n')
        .replace(/<\s*\/div\s*>/gi,'\n')
        .replace(/<\s*li\s*>/gi,'\n• ')
        .replace(/<\s*\/li\s*>/gi,'\n')
        .replace(/<[^>]*>/g,'')
        .replace(/\r/g,'')
        .replace(/[ \t]+\n/g,'\n')
        .replace(/\n{3,}/g,'\n\n')
        .trim());
}
function getLineType(line){
    if(/^Triage level:/i.test(line)) return 'highlight';
    if(/^Pet context found:/i.test(line)) return 'context';
    if(/^Follow-up questions:/i.test(line) || /^General guidance:/i.test(line) || /^Recent records:/i.test(line)) return 'section';
    if(/^Diagnosis:/i.test(line) || /^Treatment:/i.test(line)) return 'subline';
    if(/^•/.test(line)) return 'bullet';
    if(/^\d+\./.test(line)) return 'step';
    return 'line';
}
function formatVetrixAnswer(html){
    const text = normalizeChatAnswer(html);
    const parts = text.split(/\n+/).map(line=>line.trim()).filter(Boolean);
    let out = '<div class="vetrix-answer">';
    parts.forEach(line=>{
        const clean = escapeHtml(line);
        const type = getLineType(line);
        if(type === 'highlight'){
            out += `<div class="vetrix-line vetrix-highlight">${clean}</div>`;
        }else if(type === 'context'){
            out += `<div class="vetrix-line vetrix-context">${clean}</div>`;
        }else if(type === 'section'){
            out += `<div class="vetrix-section-title">${clean}</div>`;
        }else if(type === 'bullet'){
            out += `<div class="vetrix-bullet">${clean}</div>`;
        }else if(type === 'step'){
            out += `<div class="vetrix-step">${clean}</div>`;
        }else if(type === 'subline'){
            out += `<div class="vetrix-subline">${clean}</div>`;
        }else{
            out += `<div class="vetrix-line">${clean}</div>`;
        }
    });
    out += '</div>';
    return out;
}
function appendChatMessage(container, type, html, id){
    const msg=document.createElement('div');
    msg.className=`msg ${type}`;
    if(id) msg.id=id;
    msg.innerHTML=html;
    container.appendChild(msg);
    container.scrollTop=container.scrollHeight;
    return msg;
}
async function sendChat(){
    const input=document.getElementById('chatInput');
    const chatBox=document.getElementById('chatBox');
    if(!input||!chatBox) return;
    const message=input.value.trim();
    if(!message) return;

    appendChatMessage(chatBox, 'user', escapeHtml(message));
    input.value='';

    const id='typing'+Date.now();
    appendChatMessage(chatBox, 'bot typing-message', '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-text">Preparing clear guidance...</span>', id);

    try{
        const res=await fetch('../api/chatbot.php',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({message})
        });
        const data=await res.json();
        const typing=document.getElementById(id);
        if(typing) typing.remove();

        let html=`<div class="vetrix-name">Vetrix</div>${formatVetrixAnswer(data.answer)}`;
        if(data.links&&data.links.length){
            html+=`<div class="vetrix-research"><b>Related research links:</b><ul>`;
            data.links.forEach(l=>{
                html+=`<li><a href="${escapeHtml(l.url)}" target="_blank" rel="noopener">${escapeHtml(l.title)}</a></li>`;
            });
            html+=`</ul></div>`;
        }
        html+=`<div class="vetrix-note">Guidance only. For severe or persistent symptoms, contact a veterinarian.</div>`;
        appendChatMessage(chatBox, 'bot', html);
    }catch(e){
        const el=document.getElementById(id);
        if(el) el.innerHTML='Could not connect to the chatbot API. Check Apache/MySQL and internet connection.';
    }
    chatBox.scrollTop=chatBox.scrollHeight;
}

function switchMobileView(name, btn){
    document.querySelectorAll('.mobile-view').forEach(view=>view.classList.remove('active'));
    const activeView=document.getElementById('view-'+name);
    if(activeView) activeView.classList.add('active');
    document.querySelectorAll('.phone-nav button').forEach(button=>button.classList.remove('active'));
    if(btn) btn.classList.add('active');
    toggleMobileNotifications(null, false);
}
function toggleMobileNotifications(event, force){
    if(event){
        event.preventDefault();
        event.stopPropagation();
    }
    const panel=document.getElementById('mobileNotificationPanel');
    const button=document.getElementById('mobileBellBtn');
    const badge=button ? button.querySelector('.mobile-bell-badge') : null;
    if(!panel) return;
    const shouldOpen = typeof force === 'boolean' ? force : !panel.classList.contains('show');
    panel.classList.toggle('show', shouldOpen);
    if(button) button.classList.toggle('active', shouldOpen);
    if(shouldOpen && badge) badge.classList.add('is-hidden');
}

document.addEventListener('click', function(event){
    const panel=document.getElementById('mobileNotificationPanel');
    const button=document.getElementById('mobileBellBtn');
    if(!panel || !button || !panel.classList.contains('show')) return;
    if(panel.contains(event.target) || button.contains(event.target)) return;
    panel.classList.remove('show');
    button.classList.remove('active');
});
function showMobileToast(message){
    const toast=document.getElementById('mobileToast');
    if(!toast) return;
    toast.textContent=message;
    toast.classList.add('show');
    setTimeout(()=>toast.classList.remove('show'),2200);
}
function simulateMobileAI(message){
    const chat=document.getElementById('mobileAiChat');
    if(!chat) return;
    chat.innerHTML += `<div class="ai-bubble user">${escapeHtml(message)}</div>`;
    let reply='This is only a simulation. The real client app connects to the Vetrix chatbot for pet guidance and safety reminders.';
    if(message.toLowerCase().includes('vomit')) reply='For vomiting, monitor hydration and appetite. If your pet is weak, repeatedly vomiting, or not eating, visit the clinic.';
    if(message.toLowerCase().includes('sneez')) reply='For sneezing, observe breathing, appetite, and discharge. Persistent symptoms should be checked by the veterinarian.';
    if(message.toLowerCase().includes('vaccine')) reply='Mild tiredness can happen after vaccines, but swelling, breathing problems, or severe weakness need urgent care.';
    chat.innerHTML += `<div class="ai-bubble bot">${escapeHtml(reply)}</div>`;
    chat.scrollTop=chat.scrollHeight;
}

async function loadMobileApiSummary(){
    const box=document.getElementById('mobileApiResult');
    if(!box) return;
    box.className='api-result mt-3';
    box.textContent='Checking live client data...';
    try{
        const res=await fetch('../api/mobile_summary.php',{headers:{'Accept':'application/json'}});
        const data=await res.json();
        if(!data.success){throw new Error(data.message||'Unable to read summary.');}
        const s=data.summary;
        let next='No upcoming appointment yet.';
        if(data.next_appointment){
            const n=data.next_appointment;
            next=`Next: ${n.pet} is ${n.status} on ${n.scheduled_date || n.requested_date}.`;
        }
        box.className='api-result ok mt-3';
        box.innerHTML=`Connected ✅<br><b>${s.pets}</b> pets, <b>${s.appointments}</b> appointments, <b>${s.unread}</b> unread alerts.<br>${escapeHtml(next)}`;
    }catch(e){
        box.className='api-result bad mt-3';
        box.textContent='API check failed. Make sure you are logged in as client and Apache/MySQL are running.';
    }
}

// Whole-system UI helpers
function toggleSidebar(force){
    const sidebar=document.getElementById('appSidebar');
    const backdrop=document.querySelector('.sidebar-backdrop');
    if(!sidebar) return;
    const shouldOpen = typeof force === 'boolean' ? force : !sidebar.classList.contains('open');
    sidebar.classList.toggle('open', shouldOpen);
    if(backdrop) backdrop.classList.toggle('show', shouldOpen);
}
function toggleFloatingChat(force){
    const box=document.getElementById('floatingAi');
    const input=document.getElementById('floatingAiInput');
    if(!box) return;
    const shouldOpen = typeof force === 'boolean' ? force : !box.classList.contains('open');
    box.classList.toggle('open', shouldOpen);
    if(shouldOpen && input) setTimeout(()=>input.focus(),80);
}
function askFloatingAI(text){
    const input=document.getElementById('floatingAiInput');
    if(input){input.value=text; sendFloatingAI();}
}
async function sendFloatingAI(){
    const input=document.getElementById('floatingAiInput');
    const body=document.getElementById('floatingAiBody');
    if(!input||!body) return;
    const message=input.value.trim();
    if(!message) return;
    body.innerHTML += `<div class="float-msg user">${escapeHtml(message)}</div>`;
    input.value='';
    const id='floatTyping'+Date.now();
    body.innerHTML += `<div class="float-msg bot" id="${id}">Typing simple answer...</div>`;
    body.scrollTop=body.scrollHeight;
    try{
        const base = window.VETRIX_BASE || '/vet_clinic/';
        const res=await fetch(base.replace(/\/$/,'') + '/api/chatbot.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message})});
        const data=await res.json();
        const typing=document.getElementById(id);
        if(typing) typing.remove();
        let answer=normalizeChatAnswer(data.answer || 'I could not prepare an answer.');
        // Keep the floating answer shorter, but preserve line breaks so it stays readable.
        answer = answer.split('\n').map(line=>line.trim()).filter(Boolean).slice(0,7).join('\n');
        if(answer.length>700) answer=answer.slice(0,700)+'...';
        body.innerHTML += `<div class="float-msg bot"><b>Vetrix:</b><div class="floating-answer-text">${escapeHtml(answer).replace(/\n/g,'<br>')}</div><div class="small text-muted mt-2">Guidance only. Ask the clinic for serious symptoms.</div></div>`;
    }catch(e){
        const typing=document.getElementById(id);
        if(typing) typing.innerHTML='I cannot connect right now. Make sure Apache/MySQL are running and you are logged in.';
    }
    body.scrollTop=body.scrollHeight;
}
