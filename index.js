        // Supabase 설정
        const SUPABASE_URL = 'https://audqceakcywsoxnaolzf.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZHFjZWFrY3l3c294bmFvbHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3MTM4NTEsImV4cCI6MjEwNDI4OTg1MX0.2u_bFN4Vo4GRx0VfrAqk7IknF5W-fYPf0kGGMelzxzg';
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        const welcomeMsg = document.getElementById('welcome-msg');
        
        if (userName) {
            welcomeMsg.textContent = `${userName}님 환영합니다! 🎉`;
        } else {
            alert('로그인이 필요한 페이지입니다.');
            window.location.href = 'login.html';
        }

        const TARGET_LAT = 37.545864; 
        const TARGET_LNG = 127.206951; 
        const ALLOWED_RADIUS = 50; // 허용 반경 (미터)

        const btn = document.getElementById('checkInBtn');
        const statusDiv = document.getElementById('status');

        // 두 좌표 간의 거리를 계산하는 함수 (Haversine 공식)
        function getDistance(lat1, lng1, lat2, lng2) {
            function deg2rad(deg) { return deg * (Math.PI/180); }
            const R = 6371000;
            const dLat = deg2rad(lat2 - lat1);
            const dLon = deg2rad(lng2 - lng1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
        }

        btn.addEventListener('click', () => {
            if (!navigator.geolocation) {
                statusDiv.innerHTML = "<span class='text-red-500'>이 브라우저에서는 위치 정보를 지원하지 않습니다.</span>";
                return;
            }

            statusDiv.innerHTML = "<span class='text-gray-500'>카카오맵 기반으로 위치를 확인 중입니다... ⏳</span>";
            btn.disabled = true;

            // 카카오 SDK가 로드되어 있는지 확인 후 위치 측정
            kakao.maps.load(() => {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const currentLat = position.coords.latitude;
                        const currentLng = position.coords.longitude;
                        
                        // 카카오맵 기준 거리 계산
                        const distance = getDistance(currentLat, currentLng, TARGET_LAT, TARGET_LNG);

                        if (distance <= ALLOWED_RADIUS) {
                            const now = new Date();
                            const timeString = now.toISOString().slice(0, 19).replace('T', ' ');

                            // Supabase DB에 출석 정보 업데이트
                            const { error } = await supabaseClient
                                .from('login')
                                .update({ 
                                    attendance_status: '출석완료', 
                                    attendance_time: timeString 
                                })
                                .eq('name', userName);

                            if (error) {
                                statusDiv.innerHTML = `<span class='text-red-500'>❌ 출석 저장 실패: ${error.message}</span>`;
                                btn.disabled = false;
                            } else {
                                statusDiv.innerHTML = `<span class='text-green-600 font-bold'>✅ 출석 완료 및 저장 성공!<br>(오차 거리: ${Math.round(distance)}m)</span>`;
                            }
                        } else {
                            statusDiv.innerHTML = `<span class='text-red-500'>❌ 출석 실패<br>지정된 장소에서 너무 멉니다.<br>(현재 거리: ${Math.round(distance)}m)</span>`;
                            btn.disabled = false;
                        }
                    },
                    (error) => {
                        btn.disabled = false;
                        statusDiv.innerHTML = "<span class='text-red-500'>위치 정보를 가져오는 데 실패했습니다. 위치 권한을 허용해 주세요.</span>";
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
                );
            });
        });