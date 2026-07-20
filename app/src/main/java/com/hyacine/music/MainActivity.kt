package com.hyacine.music

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow

private val Blue = Color(0xFF00A1FF)
private val Gray = Color(0xFF86909C)
private val Background = Color(0xFFF5F7FA)
private const val ANIMATION = 200

data class Song(val title: String, val artist: String, val color: Color)
data class PlayerState(val song: Song, val playing: Boolean = false, val expanded: Boolean = false)
data class TabSpec(val name: String, val icon: ImageVector)

class PlayerViewModel : ViewModel() {
    private val songs = listOf(
        Song("如愿", "王菲", Color(0xFFB7D9F8)),
        Song("孤勇者", "陈奕迅", Color(0xFFFFC9AE)),
        Song("晚风心里吹", "阿梨粤", Color(0xFFD7C4F5))
    )
    private var index = 0
    private val _state = MutableStateFlow(PlayerState(songs.first()))
    val state = _state.asStateFlow()
    fun toggle() { _state.value = _state.value.copy(playing = !_state.value.playing) }
    fun expand(value: Boolean) { _state.value = _state.value.copy(expanded = value) }
    fun next() { index = (index + 1) % songs.size; _state.value = _state.value.copy(song = songs[index]) }
    fun previous() { index = (index + songs.size - 1) % songs.size; _state.value = _state.value.copy(song = songs[index]) }
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) = super.onCreate(savedInstanceState).also {
        setContent { MusicApp() }
    }
}

@Composable
fun MusicApp(viewModel: PlayerViewModel = viewModel()) {
    val player by viewModel.state.collectAsState()
    var tab by remember { mutableIntStateOf(0) }
    var navVisible by remember { mutableStateOf(true) }
    val tabs = remember { listOf(TabSpec("首页", Icons.Default.Home), TabSpec("音乐厅", Icons.Default.Explore), TabSpec("我的", Icons.Default.Person)) }
    MaterialTheme(colorScheme = lightColorScheme(primary = Blue, background = Background)) {
        Box(Modifier.fillMaxSize().background(Background)) {
            if (player.expanded) {
                FullPlayer(player, viewModel::toggle) { viewModel.expand(false) }
            } else {
                ContentPage(tab, onScrollUp = { navVisible = false }, onScrollDown = { navVisible = true })
                MiniPlayer(player, viewModel::toggle, viewModel::next, viewModel::previous, { viewModel.expand(true) }, Modifier.align(Alignment.BottomCenter).padding(bottom = 100.dp))
                FloatingNav(tabs, tab, player.playing, navVisible, { tab = it }, viewModel::toggle, Modifier.align(Alignment.BottomCenter))
            }
        }
    }
}

@Composable
private fun ContentPage(tab: Int, onScrollUp: () -> Unit, onScrollDown: () -> Unit) {
    val title = listOf("首页", "音乐厅", "我的")[tab]
    val description = listOf("每日推荐 · 发现喜欢的音乐", "歌单、榜单、新歌与电台", "收藏、歌单、最近播放")[tab]
    val listState = androidx.compose.foundation.lazy.rememberLazyListState()
    var previousIndex by remember { mutableIntStateOf(0) }
    LaunchedEffect(listState.firstVisibleItemIndex) {
        val current = listState.firstVisibleItemIndex
        if (current > previousIndex) onScrollUp() else if (current < previousIndex) onScrollDown()
        previousIndex = current
    }
    LazyColumn(
        state = listState,
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = 20.dp, top = 56.dp, end = 20.dp, bottom = 176.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text(title, fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color(0xFF1D2129))
            Text(description, Modifier.padding(top = 8.dp, bottom = 12.dp), color = Gray)
        }
        items((1..40).toList()) { number ->
            ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = Color.White), elevation = CardDefaults.elevatedCardElevation(0.dp)) {
                Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(56.dp).clip(RoundedCornerShape(15.dp)).background(if (number % 2 == 0) Color(0xFFE0F2FF) else Color(0xFFFDE8DF)), contentAlignment = Alignment.Center) { Icon(Icons.Default.MusicNote, null, tint = Blue) }
                    Column(Modifier.padding(start = 14.dp).weight(1f)) {
                        Text("为你推荐的歌曲 $number", fontWeight = FontWeight.SemiBold)
                        Text("风堇音乐", fontSize = 13.sp, color = Gray)
                    }
                    Icon(Icons.Default.MoreVert, null, tint = Gray)
                }
            }
        }
    }
}

@Composable
private fun MiniPlayer(player: PlayerState, toggle: () -> Unit, next: () -> Unit, previous: () -> Unit, open: () -> Unit, modifier: Modifier) {
    var drag by remember { mutableFloatStateOf(0f) }
    Surface(
        modifier.fillMaxWidth().padding(horizontal = 16.dp).height(64.dp).pointerInput(Unit) {
            detectHorizontalDragGestures(onHorizontalDrag = { _, delta -> drag += delta }, onDragEnd = {
                if (drag <= -30f) next(); if (drag >= 30f) previous(); drag = 0f
            })
        },
        shape = RoundedCornerShape(32.dp), color = Color.White.copy(alpha = if (player.playing) .90f else .85f), shadowElevation = 8.dp
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(46.dp).clip(CircleShape).background(player.song.color).clickable { open() }, contentAlignment = Alignment.Center) { Icon(Icons.Default.Album, null, tint = Blue) }
            Column(Modifier.weight(1f).padding(start = 10.dp).clickable { open() }) {
                Text(player.song.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(player.song.artist, fontSize = 12.sp, color = Gray)
            }
            IconButton(onClick = next) { Icon(Icons.Default.SkipNext, null, tint = Gray) }
            IconButton(onClick = toggle, modifier = Modifier.size(44.dp).clip(CircleShape).background(Blue)) { Icon(if (player.playing) Icons.Default.Pause else Icons.Default.PlayArrow, "播放或暂停", tint = Color.White) }
        }
    }
}

@Composable
private fun FloatingNav(tabs: List<TabSpec>, selected: Int, playing: Boolean, visible: Boolean, select: (Int) -> Unit, toggle: () -> Unit, modifier: Modifier) {
    val y by animateDpAsState(if (visible) 28.dp else (-88).dp, tween(ANIMATION, easing = FastOutSlowInEasing), label = "navigation")
    var drag by remember { mutableFloatStateOf(0f) }
    Box(modifier.fillMaxWidth().offset(y = y), contentAlignment = Alignment.BottomCenter) {
        Surface(
            Modifier.width(300.dp).height(64.dp).pointerInput(selected) {
                detectHorizontalDragGestures(onHorizontalDrag = { _, delta -> drag += delta }, onDragEnd = {
                    if (drag > 30f && selected > 0) select(selected - 1)
                    if (drag < -30f && selected < tabs.lastIndex) select(selected + 1)
                    drag = 0f
                })
            },
            shape = RoundedCornerShape(32.dp), color = Color.White.copy(alpha = if (playing) .90f else .85f), shadowElevation = 8.dp
        ) {
            Row(Modifier.fillMaxSize().padding(start = 6.dp, end = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                tabs.forEachIndexed { index, item -> NavItem(item, index == selected) { select(index) } }
                IconButton(onClick = toggle, modifier = Modifier.size(56.dp).clip(CircleShape).background(Blue)) { Icon(if (playing) Icons.Default.Pause else Icons.Default.PlayArrow, "播放或暂停", tint = Color.White) }
            }
        }
    }
}

@Composable
private fun RowScope.NavItem(item: TabSpec, selected: Boolean, click: () -> Unit) {
    val scale by animateFloatAsState(if (selected) 1.1f else 1f, tween(ANIMATION), label = "scale")
    val color = if (selected) Blue else Gray
    Column(Modifier.weight(1f).fillMaxHeight().clickable { click() }.padding(vertical = 6.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Icon(item.icon, item.name, modifier = Modifier.size(24.dp).scale(scale), tint = color)
        Text(item.name, fontSize = 10.sp, fontWeight = FontWeight.Medium, color = color)
        Spacer(Modifier.height(2.dp))
        Box(Modifier.width(if (selected) 20.dp else 0.dp).height(2.dp).clip(CircleShape).background(color))
    }
}

@Composable
private fun FullPlayer(player: PlayerState, toggle: () -> Unit, close: () -> Unit) {
    Column(Modifier.fillMaxSize().padding(horizontal = 24.dp, vertical = 48.dp)) {
        Text("⌄ 收起", color = Blue, modifier = Modifier.clickable { close() })
        Spacer(Modifier.height(44.dp))
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(RoundedCornerShape(34.dp)).background(player.song.color), contentAlignment = Alignment.Center) { Icon(Icons.Default.Album, null, modifier = Modifier.size(160.dp), tint = Blue) }
        Spacer(Modifier.height(30.dp)); Text(player.song.title, fontSize = 28.sp, fontWeight = FontWeight.Bold); Text(player.song.artist, color = Gray)
        Spacer(Modifier.weight(1f))
        LinearProgressIndicator(progress = { .36f }, modifier = Modifier.fillMaxWidth().height(4.dp).clip(CircleShape), color = Blue, trackColor = Color(0xFFE5E6EB))
        Row(Modifier.fillMaxWidth().padding(top = 24.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            IconButton(onClick = {}) { Icon(Icons.Default.SkipPrevious, null) }
            IconButton(onClick = toggle, modifier = Modifier.size(72.dp).clip(CircleShape).background(Blue)) { Icon(if (player.playing) Icons.Default.Pause else Icons.Default.PlayArrow, null, tint = Color.White) }
            IconButton(onClick = {}) { Icon(Icons.Default.SkipNext, null) }
        }
    }
}