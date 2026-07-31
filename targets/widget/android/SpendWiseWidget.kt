package com.mearslanahmed.SpendWise

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.action.clickable
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.color.ColorProvider
import androidx.glance.layout.Alignment
import androidx.glance.layout.Box
import androidx.glance.layout.Row
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.text.TextStyle
import androidx.glance.text.FontWeight
import androidx.compose.ui.unit.sp
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.height
import androidx.glance.appwidget.cornerRadius
import androidx.glance.layout.fillMaxWidth

class SpendWiseWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            WidgetUI()
        }
    }
}

@Composable
fun WidgetUI() {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("spendwise://transactionModal"))
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK

    Box(
        modifier = GlanceModifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        // Floating Circular Button
        Box(
            modifier = GlanceModifier
                .cornerRadius(100.dp)
                .background(Color(0xFFA3E635)) // SpendWise Primary
                .padding(16.dp)
                .clickable(actionStartActivity(intent)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                provider = ImageProvider(R.drawable.ic_add),
                contentDescription = "New Transaction"
            )
        }
    }
}