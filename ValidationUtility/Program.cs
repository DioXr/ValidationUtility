using QAUtility.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllersWithViews()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNamingPolicy = null; // THIS IS MANDATORY
    });
// Tells the app to generate the API documentation
builder.Services.AddEndpointsApiExplorer();
// This sets up the HttpClient and connects our interface to our implementation
builder.Services.AddHttpClient<IGeminiValidationService, GeminiValidationService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<QAUtility.Services.IGeminiValidationService, QAUtility.Services.GeminiValidationService>();


var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();

    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseRouting();

app.UseAuthorization();

app.MapStaticAssets();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}")
    .WithStaticAssets();


app.Run();
