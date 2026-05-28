// ========== script.js (feed estilo Instagram) ==========
(function() {
    // Constantes
    const STORAGE_KEYS = {
        users: 'gameSocial_users',
        posts: 'gameSocial_posts',
        currentUser: 'gameSocial_currentUser'
    };

    const STATUS_MAP = {
        'playing': { label: '🟢 Jogando', badgeClass: 'badge-playing', cardClass: 'status-playing', icon: 'bi-play-circle-fill' },
        'completed': { label: '✅ Zerou', badgeClass: 'badge-completed', cardClass: 'status-completed', icon: 'bi-trophy-fill' },
        'dropped': { label: '🔴 Parou no meio', badgeClass: 'badge-dropped', cardClass: 'status-dropped', icon: 'bi-stop-circle-fill' }
    };

    // Estado global
    let currentUser = null;
    let allPosts = [];
    let allUsers = [];
    let publicProfileUserId = null;
    let postIdToDelete = null;

    // Modais Bootstrap
    let newPostModalInstance, editPostModalInstance, deleteConfirmModalInstance;

    // Inicialização
    function init() {
        loadDataFromStorage();
        checkAuthState();
        setupEventListeners();
        initBootstrapModals();
    }

    function loadDataFromStorage() {
        const usersJson = localStorage.getItem(STORAGE_KEYS.users);
        const postsJson = localStorage.getItem(STORAGE_KEYS.posts);
        const currentUserJson = localStorage.getItem(STORAGE_KEYS.currentUser);
        allUsers = usersJson ? JSON.parse(usersJson) : [];
        allPosts = postsJson ? JSON.parse(postsJson) : [];
        currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;
    }

    function saveUsersToStorage() { localStorage.setItem(STORAGE_KEYS.users, JSON.stringify(allUsers)); }
    function savePostsToStorage() { localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(allPosts)); }
    function saveCurrentUserToStorage() {
        if (currentUser) localStorage.setItem(STORAGE_KEYS.currentUser, JSON.stringify(currentUser));
        else localStorage.removeItem(STORAGE_KEYS.currentUser);
    }

    function initBootstrapModals() {
        newPostModalInstance = new bootstrap.Modal(document.getElementById('newPostModal'));
        editPostModalInstance = new bootstrap.Modal(document.getElementById('editPostModal'));
        deleteConfirmModalInstance = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    }

    function checkAuthState() {
        if (currentUser) {
            showAppSection();
            updateNavbarUserInfo();
            navigateTo('feed');
        } else {
            showAuthSection();
        }
    }

    function showAuthSection() {
        document.getElementById('authSection').style.display = 'flex';
        document.getElementById('appSection').style.display = 'none';
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        clearAuthForms();
        clearAuthErrors();
    }

    function showAppSection() {
        document.getElementById('authSection').style.display = 'none';
        document.getElementById('appSection').style.display = 'block';
    }

    function navigateTo(viewName) {
        document.getElementById('feedView').style.display = 'none';
        document.getElementById('myProfileView').style.display = 'none';
        document.getElementById('publicProfileView').style.display = 'none';
        document.querySelectorAll('#navLinks .nav-link-custom').forEach(link => link.classList.remove('active'));

        switch (viewName) {
            case 'feed':
                document.getElementById('feedView').style.display = 'block';
                document.getElementById('navFeed').classList.add('active');
                renderFeed();
                break;
            case 'myProfile':
                document.getElementById('myProfileView').style.display = 'block';
                document.getElementById('navMyProfile').classList.add('active');
                renderMyProfile();
                break;
            case 'publicProfile':
                document.getElementById('publicProfileView').style.display = 'block';
                renderPublicProfile();
                break;
            default:
                document.getElementById('feedView').style.display = 'block';
                document.getElementById('navFeed').classList.add('active');
                renderFeed();
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Autenticação
    function registerUser(username, password) {
        if (allUsers.find(u => u.username.toLowerCase() === username.toLowerCase())) {
            showAuthError('register', 'Este nome de usuário já está em uso.');
            return false;
        }
        allUsers.push({
            id: generateId(),
            username: username.trim(),
            password: password,
            profileImage: null,
            createdAt: new Date().toISOString()
        });
        saveUsersToStorage();
        return true;
    }

    function loginUser(username, password) {
        const user = allUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
        if (!user) {
            showAuthError('login', 'Nome de usuário ou senha incorretos.');
            return false;
        }
        currentUser = user;
        saveCurrentUserToStorage();
        return true;
    }

    function logoutUser() {
        currentUser = null;
        saveCurrentUserToStorage();
        publicProfileUserId = null;
        postIdToDelete = null;
        showAuthSection();
        showToast('Você saiu da conta.', 'info');
    }

    function refreshCurrentUserFromStorage() {
        if (!currentUser) return;
        const updated = allUsers.find(u => u.id === currentUser.id);
        if (updated) {
            currentUser = updated;
            saveCurrentUserToStorage();
        }
    }

    // CRUD Posts
    function createPost(gameName, status, rating, observation) {
        const post = {
            id: generateId(),
            userId: currentUser.id,
            username: currentUser.username,
            gameName: gameName.trim(),
            status: status,
            rating: parseInt(rating),
            observation: observation.trim(),
            createdAt: new Date().toISOString()
        };
        allPosts.unshift(post);
        savePostsToStorage();
        return post;
    }

    function updatePost(postId, gameName, status, rating, observation) {
        const idx = allPosts.findIndex(p => p.id === postId);
        if (idx === -1 || allPosts[idx].userId !== currentUser.id) return false;
        allPosts[idx].gameName = gameName.trim();
        allPosts[idx].status = status;
        allPosts[idx].rating = parseInt(rating);
        allPosts[idx].observation = observation.trim();
        allPosts[idx].updatedAt = new Date().toISOString();
        savePostsToStorage();
        return true;
    }

    function deletePost(postId) {
        const idx = allPosts.findIndex(p => p.id === postId);
        if (idx === -1 || allPosts[idx].userId !== currentUser.id) return false;
        allPosts.splice(idx, 1);
        savePostsToStorage();
        return true;
    }

    function getUserPosts(userId) { return allPosts.filter(p => p.userId === userId); }
    function getUserById(userId) { return allUsers.find(u => u.id === userId) || null; }
    function getPostById(postId) { return allPosts.find(p => p.id === postId) || null; }

    // Renderização
    function renderFeed() {
        const container = document.getElementById('feedPostsContainer');
        if (allPosts.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="bi bi-controller"></i><h4>Nenhuma publicação ainda</h4><p>Seja o primeiro a publicar!</p></div>`;
            return;
        }
        // NOVO: container single-column centralizado
        const postsHtml = allPosts.map(p => buildPostCardHtml(p, false)).join('');
        container.innerHTML = `<div class="feed-posts">${postsHtml}</div>`;
        attachPostCardListeners();
    }

    function renderMyProfile() {
        if (!currentUser) return;
        refreshCurrentUserFromStorage();
        const myPosts = getUserPosts(currentUser.id);
        const stats = calculateUserStats(currentUser.id);
        document.getElementById('myProfileHeader').innerHTML = buildProfileHeaderHtml(currentUser, stats, true);
        const postsContainer = document.getElementById('myProfilePostsContainer');
        if (myPosts.length === 0) {
            postsContainer.innerHTML = `<div class="empty-state"><i class="bi bi-journal-x"></i><h4>Você ainda não publicou nada</h4></div>`;
        } else {
            postsContainer.innerHTML = `<div class="row g-3">${myPosts.map(p => buildPostCardHtml(p, true)).join('')}</div>`;
            attachPostCardListeners();
        }
        document.getElementById('profileImageInput').addEventListener('change', handleProfileImageUpload);
    }

    function renderPublicProfile() {
        if (!publicProfileUserId) { navigateTo('feed'); return; }
        const user = getUserById(publicProfileUserId);
        if (!user) { showToast('Usuário não encontrado.', 'danger'); navigateTo('feed'); return; }
        if (currentUser && user.id === currentUser.id) { navigateTo('myProfile'); return; }

        const userPosts = getUserPosts(user.id);
        const stats = calculateUserStats(user.id);
        document.getElementById('publicProfileHeader').innerHTML = buildProfileHeaderHtml(user, stats, false);
        const container = document.getElementById('publicProfilePostsContainer');
        if (userPosts.length === 0) {
            container.innerHTML = `<div class="empty-state"><i class="bi bi-journal-x"></i><h4>Nenhuma publicação</h4></div>`;
        } else {
            container.innerHTML = `<div class="row g-3">${userPosts.map(p => buildPostCardHtml(p, false)).join('')}</div>`;
            attachPostCardListeners();
        }
    }

    function buildProfileHeaderHtml(user, stats, isOwn) {
        const avatarHtml = generateAvatarHtml(user.username, 'avatar-lg', user.profileImage);
        const total = stats.playing + stats.completed + stats.dropped;

        let avatarBlock = '';
        if (isOwn) {
            avatarBlock = `
                <div class="avatar-upload-wrapper">
                    ${avatarHtml}
                    <div class="avatar-upload-btn" id="triggerUploadBtn" title="Alterar foto de perfil">
                        <i class="bi bi-camera-fill"></i>
                    </div>
                </div>
                ${user.profileImage ? '<button class="remove-photo-btn" id="removePhotoBtn">Remover foto</button>' : ''}
            `;
        } else {
            avatarBlock = avatarHtml;
        }

        return `
            <div class="profile-header">
                <div class="d-flex justify-content-center mb-3">
                    ${avatarBlock}
                </div>
                <h3 class="fw-bold mb-1" style="color:#f1f5f9;">${escapeHtml(user.username)}</h3>
                <p class="text-muted mb-0">${isOwn ? 'Este é o seu perfil ✏️' : 'Perfil público 👀'}</p>
                <div class="profile-stats">
                    <div class="stat-item"><div class="stat-number">${total}</div><div class="stat-label">Total</div></div>
                    <div class="stat-item stat-playing"><div class="stat-number">${stats.playing}</div><div class="stat-label">Jogando</div></div>
                    <div class="stat-item stat-completed"><div class="stat-number">${stats.completed}</div><div class="stat-label">Zerados</div></div>
                    <div class="stat-item stat-dropped"><div class="stat-number">${stats.dropped}</div><div class="stat-label">Parados</div></div>
                </div>
            </div>`;
    }

    function buildPostCardHtml(post, showActions) {
        const postUser = getUserById(post.userId) || { username: post.username, profileImage: null };
        const statusInfo = STATUS_MAP[post.status] || STATUS_MAP['playing'];
        const stars = buildStarsDisplay(post.rating);
        const timeAgo = getTimeAgo(post.createdAt);
        const obs = post.observation ? `<div class="observation-text">"${escapeHtml(post.observation)}"</div>` : '';
        const isOwn = currentUser && post.userId === currentUser.id;
        const userClick = isOwn ? `onclick="window._navigateToMyProfile()"` : `onclick="window._viewPublicProfile('${post.userId}')"`;
        const actionsHtml = (showActions && isOwn) ? `
            <div class="d-flex gap-1 ms-auto">
                <button class="btn-action-icon btn-edit" onclick="window._editPost('${post.id}')" title="Editar"><i class="bi bi-pencil"></i></button>
                <button class="btn-action-icon btn-delete" onclick="window._confirmDeletePost('${post.id}')" title="Excluir"><i class="bi bi-trash"></i></button>
            </div>` : '';

        return `
            <div class="post-card ${statusInfo.cardClass}">
                <div class="d-flex align-items-center gap-3 mb-3">
                    <span ${userClick} style="cursor:pointer;" title="Ver perfil">${generateAvatarHtml(postUser.username, '', postUser.profileImage)}</span>
                    <div class="flex-grow-1 min-width-0">
                        <span ${userClick} class="username-link d-block text-truncate">${escapeHtml(postUser.username)}</span>
                        <span class="time-ago"><i class="bi bi-clock"></i> ${timeAgo}</span>
                    </div>
                    ${actionsHtml}
                </div>
                <h5 class="game-title mb-2"><i class="bi bi-controller me-2" style="color:#8b5cf6;"></i>${escapeHtml(post.gameName)}</h5>
                <div class="d-flex align-items-center gap-2 mb-2 flex-wrap">
                    <span class="badge-status ${statusInfo.badgeClass}"><i class="bi ${statusInfo.icon}"></i> ${statusInfo.label}</span>
                    <span class="stars-display">${stars}</span>
                </div>
                ${obs}
            </div>`;
    }

    function buildStarsDisplay(rating) {
        let html = '';
        for (let i=1; i<=5; i++) html += i<=rating ? '<i class="bi bi-star-fill"></i>' : '<i class="bi bi-star"></i>';
        return html;
    }

    function generateAvatarHtml(username, extraClasses = '', profileImage = null) {
        const initial = username.charAt(0).toUpperCase();
        const bgColor = stringToColor(username);
        const hasImage = profileImage && profileImage.trim() !== '';

        if (hasImage) {
            return `<span class="avatar-circle ${extraClasses} has-image" style="background-image: url('${profileImage}');" title="${escapeHtml(username)}">${initial}</span>`;
        } else {
            return `<span class="avatar-circle ${extraClasses}" style="background:${bgColor};" title="${escapeHtml(username)}">${initial}</span>`;
        }
    }

    function attachPostCardListeners() { /* delegado via window */ }

    // Funções globais
    window._navigateToMyProfile = () => navigateTo('myProfile');
    window._viewPublicProfile = (userId) => { publicProfileUserId = userId; navigateTo('publicProfile'); };
    window._editPost = (postId) => openEditPostModal(postId);
    window._confirmDeletePost = (postId) => openDeleteConfirmModal(postId);

    // Modais
    function openNewPostModal() {
        document.getElementById('newPostForm').reset();
        document.getElementById('newRatingValue').value = '0';
        document.getElementById('newRatingText').style.display = 'block';
        document.querySelector('#newPostForm .invalid-feedback-rating').style.display = 'none';
        resetStars('newRatingStars');
        clearFormValidation('newPostForm');
        newPostModalInstance.show();
    }

    function openEditPostModal(postId) {
        const post = getPostById(postId);
        if (!post || post.userId !== currentUser.id) { showToast('Publicação não encontrada.', 'danger'); return; }
        document.getElementById('editPostId').value = post.id;
        document.getElementById('editGameName').value = post.gameName;
        document.getElementById('editStatus').value = post.status;
        document.getElementById('editObservation').value = post.observation || '';
        document.getElementById('editRatingValue').value = post.rating;
        document.querySelector('#editPostForm .invalid-feedback-rating').style.display = 'none';
        setStars('editRatingStars', post.rating);
        clearFormValidation('editPostForm');
        editPostModalInstance.show();
    }

    function openDeleteConfirmModal(postId) {
        const post = getPostById(postId);
        if (!post || post.userId !== currentUser.id) { showToast('Publicação não encontrada.', 'danger'); return; }
        postIdToDelete = postId;
        document.getElementById('deleteGameName').textContent = `"${post.gameName}"`;
        deleteConfirmModalInstance.show();
    }

    function confirmDeletePost() {
        if (!postIdToDelete) return;
        if (deletePost(postIdToDelete)) {
            showToast('Publicação excluída!', 'success');
            deleteConfirmModalInstance.hide();
            postIdToDelete = null;
            refreshCurrentView();
        } else {
            showToast('Erro ao excluir.', 'danger');
        }
    }

    function refreshCurrentView() {
        if (document.getElementById('feedView').style.display !== 'none') renderFeed();
        else if (document.getElementById('myProfileView').style.display !== 'none') renderMyProfile();
        else if (document.getElementById('publicProfileView').style.display !== 'none') renderPublicProfile();
    }

    // Upload e remoção de foto
    function handleProfileImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Por favor, selecione uma imagem.', 'warning');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const size = 150;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);

                const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
                if (userIndex !== -1) {
                    allUsers[userIndex].profileImage = resizedDataUrl;
                    saveUsersToStorage();
                    refreshCurrentUserFromStorage();
                    updateNavbarUserInfo();
                    renderMyProfile();
                    showToast('Foto de perfil atualizada!', 'success');
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
        event.target.value = '';
    }

    function removeProfileImage() {
        if (!currentUser) return;
        const userIndex = allUsers.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            allUsers[userIndex].profileImage = null;
            saveUsersToStorage();
            refreshCurrentUserFromStorage();
            updateNavbarUserInfo();
            renderMyProfile();
            showToast('Foto de perfil removida.', 'info');
        }
    }

    // Estrelas
    function setupStarsInteraction(containerId, hiddenInputId, ratingTextId) {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.star-item').forEach(star => {
            star.addEventListener('mouseenter', () => highlightStars(containerId, parseInt(star.dataset.value)));
            star.addEventListener('click', () => {
                const val = parseInt(star.dataset.value);
                document.getElementById(hiddenInputId).value = val;
                setStars(containerId, val);
                if (ratingTextId) document.getElementById(ratingTextId).style.display = 'none';
                const err = container.parentElement.querySelector('.invalid-feedback-rating');
                if (err) err.style.display = 'none';
            });
        });
        container.addEventListener('mouseleave', () => setStars(containerId, parseInt(document.getElementById(hiddenInputId).value) || 0));
        setStars(containerId, 0);
    }
    function highlightStars(id, val) { document.getElementById(id).querySelectorAll('.star-item').forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= val)); }
    function setStars(id, val) { document.getElementById(id).querySelectorAll('.star-item').forEach(s => s.classList.toggle('active', parseInt(s.dataset.value) <= val)); }
    function resetStars(id) { setStars(id, 0); }

    // Utilitários
    function generateId() { return 'id_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2,9); }
    function stringToColor(str) { let hash=0; for(let i=0;i<str.length;i++) hash = str.charCodeAt(i) + ((hash<<5)-hash); return `hsl(${Math.abs(hash)%360}, 55%, 45%)`; }
    function escapeHtml(text) { const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }
    function getTimeAgo(ts) { const diff=Date.now()-new Date(ts).getTime(); const s=Math.floor(diff/1000), m=Math.floor(s/60), h=Math.floor(m/60), d=Math.floor(h/24), w=Math.floor(d/7), mo=Math.floor(d/30); if(s<60) return 'Agora'; if(m<60) return `Há ${m}min`; if(h<24) return `Há ${h}h`; if(d<7) return `Há ${d}d`; if(w<4) return `Há ${w}sem`; if(mo<12) return `Há ${mo}mês`; return new Date(ts).toLocaleDateString('pt-BR'); }
    function calculateUserStats(uid) { const p=getUserPosts(uid); return { playing: p.filter(x=>x.status==='playing').length, completed: p.filter(x=>x.status==='completed').length, dropped: p.filter(x=>x.status==='dropped').length, total: p.length }; }
    function updateNavbarUserInfo() {
        if(!currentUser) return;
        const avatarEl = document.getElementById('currentUserAvatar');
        avatarEl.style.background = '';
        avatarEl.classList.remove('has-image');
        if (currentUser.profileImage) {
            avatarEl.style.backgroundImage = `url('${currentUser.profileImage}')`;
            avatarEl.classList.add('has-image');
            avatarEl.textContent = '';
        } else {
            avatarEl.style.background = stringToColor(currentUser.username);
            avatarEl.textContent = currentUser.username.charAt(0).toUpperCase();
            avatarEl.style.backgroundImage = '';
        }
        document.getElementById('currentUserName').textContent = currentUser.username;
    }

    function clearAuthForms() { document.getElementById('loginForm').reset(); document.getElementById('registerForm').reset(); clearFormValidation('loginForm'); clearFormValidation('registerForm'); }
    function clearAuthErrors() { document.getElementById('loginError').style.display='none'; document.getElementById('registerError').style.display='none'; }
    function showAuthError(form, msg) { const el=document.getElementById(form==='login'?'loginError':'registerError'); el.querySelector('.alert').textContent=msg; el.style.display='block'; }
    function clearFormValidation(formId) { document.getElementById(formId).classList.remove('was-validated'); const err=document.querySelector(`#${formId} .invalid-feedback-rating`); if(err) err.style.display='none'; }
    function showToast(msg, type='info') { const icons={success:'check-circle-fill', danger:'exclamation-circle-fill', info:'info-circle-fill', warning:'exclamation-triangle-fill'}; const bg={success:'bg-success', danger:'bg-danger', warning:'bg-warning text-dark', info:'bg-info text-dark'}; const t=document.createElement('div'); t.className=`toast align-items-center ${bg[type]||bg.info} border-0 mb-2`; t.innerHTML=`<div class="d-flex"><div class="toast-body d-flex align-items-center gap-2 fw-semibold"><i class="bi bi-${icons[type]||icons.info}"></i>${msg}</div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button></div>`; document.getElementById('toastContainer').appendChild(t); const bs=new bootstrap.Toast(t,{delay:3500}); bs.show(); t.addEventListener('hidden.bs.toast',()=>t.remove()); }

    // Event Listeners
    function setupEventListeners() {
        document.getElementById('showRegisterBtn').addEventListener('click', ()=>{
            document.getElementById('loginForm').style.display='none';
            document.getElementById('registerForm').style.display='block';
            clearAuthErrors(); clearFormValidation('registerForm'); document.getElementById('registerForm').reset();
        });
        document.getElementById('showLoginBtn').addEventListener('click', ()=>{
            document.getElementById('registerForm').style.display='none';
            document.getElementById('loginForm').style.display='block';
            clearAuthErrors(); clearFormValidation('loginForm'); document.getElementById('loginForm').reset();
        });
        document.getElementById('loginForm').addEventListener('submit', function(e){
            e.preventDefault(); document.getElementById('loginError').style.display='none'; this.classList.add('was-validated');
            if(!this.checkValidity()) return;
            if(loginUser(document.getElementById('loginUsername').value, document.getElementById('loginPassword').value)){
                showToast('Login realizado! 🎮', 'success'); showAppSection(); updateNavbarUserInfo(); navigateTo('feed');
            }
        });
        document.getElementById('registerForm').addEventListener('submit', function(e){
            e.preventDefault(); document.getElementById('registerError').style.display='none'; this.classList.add('was-validated');
            if(!this.checkValidity()) return;
            const pw=document.getElementById('registerPassword').value, cpw=document.getElementById('registerConfirmPassword').value;
            if(pw!==cpw){ document.getElementById('registerConfirmPassword').setCustomValidity('Senhas não coincidem.'); this.classList.add('was-validated'); return; }
            if(registerUser(document.getElementById('registerUsername').value, pw)){
                showToast('Conta criada! Faça login.', 'success');
                document.getElementById('registerForm').style.display='none'; document.getElementById('loginForm').style.display='block';
                clearAuthForms(); document.getElementById('loginUsername').value=document.getElementById('registerUsername').value;
            }
        });
        document.getElementById('registerConfirmPassword').addEventListener('input', function(){
            this.setCustomValidity(this.value!==document.getElementById('registerPassword').value?'Senhas não coincidem.':'');
        });
        document.getElementById('btnLogout').addEventListener('click', logoutUser);
        document.getElementById('navFeed').addEventListener('click', e=>{ e.preventDefault(); navigateTo('feed'); });
        document.getElementById('navMyProfile').addEventListener('click', e=>{ e.preventDefault(); navigateTo('myProfile'); });
        document.getElementById('brandHome').addEventListener('click', e=>{ e.preventDefault(); navigateTo('feed'); });
        document.getElementById('btnBackToFeed').addEventListener('click', ()=>navigateTo('feed'));
        document.getElementById('btnNewPostDesktop').addEventListener('click', openNewPostModal);
        document.getElementById('fabNewPost').addEventListener('click', openNewPostModal);
        document.getElementById('newPostForm').addEventListener('submit', function(e){
            e.preventDefault(); this.classList.add('was-validated');
            const rating=parseInt(document.getElementById('newRatingValue').value);
            if(!rating || rating<1){ document.querySelector('#newPostForm .invalid-feedback-rating').style.display='block'; return; }
            createPost(document.getElementById('newGameName').value, document.getElementById('newStatus').value, rating, document.getElementById('newObservation').value);
            showToast('Publicação criada! 🎮✨', 'success'); newPostModalInstance.hide(); document.getElementById('newPostForm').reset(); document.getElementById('newRatingValue').value='0'; resetStars('newRatingStars'); clearFormValidation('newPostForm');
            refreshCurrentView();
        });
        document.getElementById('newPostModal').addEventListener('hidden.bs.modal', ()=>{
            document.getElementById('newPostForm').reset(); document.getElementById('newRatingValue').value='0'; resetStars('newRatingStars'); clearFormValidation('newPostForm');
        });
        document.getElementById('editPostForm').addEventListener('submit', function(e){
            e.preventDefault(); this.classList.add('was-validated');
            const rating=parseInt(document.getElementById('editRatingValue').value);
            if(!rating || rating<1){ document.querySelector('#editPostForm .invalid-feedback-rating').style.display='block'; return; }
            if(updatePost(document.getElementById('editPostId').value, document.getElementById('editGameName').value, document.getElementById('editStatus').value, rating, document.getElementById('editObservation').value)){
                showToast('Publicação atualizada!', 'success'); editPostModalInstance.hide(); refreshCurrentView();
            }
        });
        document.getElementById('btnConfirmDelete').addEventListener('click', confirmDeletePost);
        setupStarsInteraction('newRatingStars', 'newRatingValue', 'newRatingText');
        setupStarsInteraction('editRatingStars', 'editRatingValue', null);

        // Delegação para botões de upload e remover (dentro do perfil)
        document.getElementById('myProfileHeader').addEventListener('click', function(e) {
            if (e.target.closest('#triggerUploadBtn')) {
                document.getElementById('profileImageInput').click();
            }
            if (e.target.closest('#removePhotoBtn')) {
                removeProfileImage();
            }
        });

        document.querySelectorAll('#navbarNav .nav-link-custom').forEach(link=>{
            link.addEventListener('click', ()=>{ const c=document.getElementById('navbarNav'); if(c.classList.contains('show')) bootstrap.Collapse.getInstance(c).hide(); });
        });
    }

    init();
    window.addEventListener('storage', e=>{ if([STORAGE_KEYS.posts, STORAGE_KEYS.users, STORAGE_KEYS.currentUser].includes(e.key)){ loadDataFromStorage(); if(currentUser){ updateNavbarUserInfo(); refreshCurrentView(); } else showAuthSection(); } });
    console.log('🎮 GameVault iniciado (feed estilo Instagram).');
})();